const axios = require("axios");
const crypto = require("crypto");
const Booking = require("../models/booking");
const Coupon = require("../models/Coupon");

const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5001;
const BACKEND_PUBLIC_URL = (process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "");
const FRONTEND_URL = (process.env.FRONTEND_URL || "").replace(/\/$/, "");

if (isProduction && !BACKEND_PUBLIC_URL) {
  throw new Error("BACKEND_PUBLIC_URL must be set in production");
}

if (isProduction && !FRONTEND_URL) {
  throw new Error("FRONTEND_URL must be set in production");
}

const effectiveBackendUrl = BACKEND_PUBLIC_URL || `http://localhost:${PORT}`;
const effectiveFrontendUrl = FRONTEND_URL || "http://localhost:5173";

const ESEWA_BASE_URL =
  process.env.ESEWA_BASE_URL || "https://rc-epay.esewa.com.np";
const ESEWA_STATUS_BASE_URL =
  process.env.ESEWA_STATUS_BASE_URL || "https://rc.esewa.com.np";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";

const KHALTI_BASE_URL =
  process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;

function parseTimeToMinutes(t) {
  if (!t) return 0;
  t = String(t).trim().toLowerCase();

  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  if (/^\d{1,2}$/.test(t)) {
    return Number(t) * 60;
  }

  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return 0;

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const ap = m[3];

  if (ap) {
    if (ap === "pm" && hour !== 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
  }

  return hour * 60 + minute;
}

function calculateBaseAmount(booking) {
  const pricePerHour = Number(booking.futsal?.pricePerHour || 0);
  const startMin = parseTimeToMinutes(booking.startTime);
  const endMin = parseTimeToMinutes(booking.endTime);
  let durationHours = (endMin - startMin) / 60;
  if (durationHours <= 0) durationHours = 1;

  return Math.round(pricePerHour * durationHours * 100) / 100;
}

async function resolveBookingAndPricing({ bookingId, userId, couponCode }) {
  const booking = await Booking.findById(bookingId).populate("futsal");
  if (!booking) {
    return { error: { status: 404, msg: "Booking not found" } };
  }

  if (booking.user.toString() !== userId) {
    return { error: { status: 403, msg: "Unauthorized" } };
  }

  if (booking.paid) {
    return { error: { status: 400, msg: "Booking already paid" } };
  }

  const baseAmount = calculateBaseAmount(booking);
  let discount = 0;
  let coupon = null;

  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode, user: userId });
    if (!coupon) return { error: { status: 404, msg: "Coupon not found" } };
    if (coupon.used)
      return { error: { status: 400, msg: "Coupon already used" } };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { error: { status: 400, msg: "Coupon expired" } };
    }
    if (
      coupon.futsal &&
      coupon.futsal.toString() !== booking.futsal._id.toString()
    ) {
      return {
        error: { status: 400, msg: "Coupon not valid for this futsal" },
      };
    }
    discount = Number(coupon.discount || 0);
  }

  const finalAmount = Math.round(baseAmount * (1 - discount / 100) * 100) / 100;

  return { booking, coupon, discount, baseAmount, finalAmount };
}

async function markPendingPayment({
  booking,
  method,
  transactionId,
  amount,
  discount,
  couponId,
  pidx,
}) {
  booking.paymentStatus = "pending";
  booking.paymentMethod = method;
  booking.paymentTransactionId = transactionId;
  booking.pendingAmount = amount;
  booking.pendingDiscount = discount;
  booking.pendingCoupon = couponId || undefined;
  booking.khaltiPidx = pidx || undefined;
  await booking.save();
}

async function markFailedPayment(booking) {
  booking.paymentStatus = "failed";
  await booking.save();
}

async function markSuccessfulPayment({ booking, amount, reference }) {
  if (booking.pendingCoupon) {
    const coupon = await Coupon.findById(booking.pendingCoupon);
    if (coupon && !coupon.used) {
      coupon.used = true;
      coupon.usedAt = new Date();
      await coupon.save();
      booking.coupon = coupon._id;
    }
  }

  booking.paid = true;
  booking.amountPaid = amount;
  booking.paymentStatus = "paid";
  booking.paymentReference = reference || booking.paymentReference;

  // clear pending snapshot
  booking.pendingAmount = undefined;
  booking.pendingDiscount = 0;
  booking.pendingCoupon = undefined;
  booking.khaltiPidx = undefined;

  await booking.save();
}

function getFrontendResultUrl({ status, bookingId, provider, message }) {
  const qs = new URLSearchParams({
    status,
    bookingId: String(bookingId || ""),
    provider: provider || "",
    message: message || "",
  });
  return `${effectiveFrontendUrl}/payment-result?${qs.toString()}`;
}

// Optional direct checkout endpoint retained for compatibility/testing.
const checkout = async (req, res) => {
  try {
    const { bookingId, couponCode } = req.body;
    if (!bookingId) return res.status(400).json({ msg: "bookingId required" });

    const result = await resolveBookingAndPricing({
      bookingId,
      userId: req.user.userId,
      couponCode,
    });
    if (result.error)
      return res.status(result.error.status).json({ msg: result.error.msg });

    const { booking, finalAmount } = result;

    await markPendingPayment({
      booking,
      method: "khalti",
      transactionId: `DIRECT-${booking._id}-${Date.now()}`,
      amount: finalAmount,
      discount: result.discount,
      couponId: result.coupon?._id,
    });

    await markSuccessfulPayment({
      booking,
      amount: finalAmount,
      reference: "DIRECT_TEST_PAYMENT",
    });

    return res.status(200).json({
      msg: "Payment recorded",
      finalAmount,
      discount: result.discount,
      couponId: result.coupon?._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

const initiateEsewaPayment = async (req, res) => {
  try {
    const { bookingId, couponCode } = req.body;
    if (!bookingId) return res.status(400).json({ msg: "bookingId required" });

    const result = await resolveBookingAndPricing({
      bookingId,
      userId: req.user.userId,
      couponCode,
    });
    if (result.error)
      return res.status(result.error.status).json({ msg: result.error.msg });

    const { booking, coupon, discount, finalAmount } = result;
    const transactionUuid = `${booking._id}-${Date.now()}`;
    const totalAmount = Number(finalAmount).toFixed(2);

    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const signPayload = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = crypto
      .createHmac("sha256", ESEWA_SECRET_KEY)
      .update(signPayload)
      .digest("base64");

    await markPendingPayment({
      booking,
      method: "esewa",
      transactionId: transactionUuid,
      amount: finalAmount,
      discount,
      couponId: coupon?._id,
    });

    const formData = {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: `${effectiveBackendUrl}/api/payments/esewa/callback`,
      failure_url: `${effectiveBackendUrl}/api/payments/esewa/failure?bookingId=${booking._id}`,
      signed_field_names: signedFieldNames,
      signature,
    };

    return res.status(200).json({
      provider: "esewa",
      paymentUrl: `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
      formData,
      amount: finalAmount,
      discount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

const esewaCallback = async (req, res) => {
  try {
    const encodedData = req.query.data;
    if (!encodedData) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "esewa",
          message: "Missing callback payload",
        }),
      );
    }

    let decoded = null;
    try {
      const raw = Buffer.from(encodedData, "base64").toString("utf8");
      decoded = JSON.parse(raw);
    } catch (err) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "esewa",
          message: "Invalid callback payload",
        }),
      );
    }

    const transactionUuid = decoded.transaction_uuid;
    const bookingId = String(transactionUuid || "").split("-")[0];
    if (!bookingId) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "esewa",
          message: "Invalid transaction",
        }),
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "esewa",
          bookingId,
          message: "Booking not found",
        }),
      );
    }

    if (booking.paid) {
      return res.redirect(
        getFrontendResultUrl({
          status: "success",
          provider: "esewa",
          bookingId,
          message: "Payment already verified",
        }),
      );
    }

    const verifyAmount = Number(
      booking.pendingAmount || decoded.total_amount || 0,
    ).toFixed(2);
    const verifyUrl = `${ESEWA_STATUS_BASE_URL}/api/epay/transaction/status/?product_code=${encodeURIComponent(ESEWA_PRODUCT_CODE)}&total_amount=${encodeURIComponent(verifyAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

    const verifyResp = await axios.get(verifyUrl);
    const status = verifyResp?.data?.status;

    if (status === "COMPLETE") {
      await markSuccessfulPayment({
        booking,
        amount: Number(booking.pendingAmount || decoded.total_amount || 0),
        reference: verifyResp?.data?.ref_id || decoded.transaction_code,
      });

      return res.redirect(
        getFrontendResultUrl({
          status: "success",
          provider: "esewa",
          bookingId,
          message: "Payment successful",
        }),
      );
    }

    await markFailedPayment(booking);
    return res.redirect(
      getFrontendResultUrl({
        status: "failed",
        provider: "esewa",
        bookingId,
        message: `Payment not complete (${status || "unknown"})`,
      }),
    );
  } catch (error) {
    console.error(error);
    return res.redirect(
      getFrontendResultUrl({
        status: "failed",
        provider: "esewa",
        message: "Server error during eSewa verification",
      }),
    );
  }
};

const esewaFailure = async (req, res) => {
  const { bookingId } = req.query;
  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking && booking.paymentStatus === "pending") {
      await markFailedPayment(booking);
    }
  }

  return res.redirect(
    getFrontendResultUrl({
      status: "failed",
      provider: "esewa",
      bookingId,
      message: "Payment canceled or failed",
    }),
  );
};

const initiateKhaltiPayment = async (req, res) => {
  try {
    const { bookingId, couponCode } = req.body;
    if (!bookingId) return res.status(400).json({ msg: "bookingId required" });
    if (!KHALTI_SECRET_KEY) {
      return res.status(500).json({ msg: "Khalti secret key not configured" });
    }

    const result = await resolveBookingAndPricing({
      bookingId,
      userId: req.user.userId,
      couponCode,
    });
    if (result.error)
      return res.status(result.error.status).json({ msg: result.error.msg });

    const { booking, coupon, discount, finalAmount } = result;
    const purchaseOrderId = `${booking._id}-${Date.now()}`;
    const amountPaisa = Math.round(finalAmount * 100);

    const payload = {
      return_url: `${BACKEND_PUBLIC_URL}/api/payments/khalti/callback`,
      website_url: FRONTEND_URL,
      amount: amountPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: `KickHub Booking ${booking._id}`,
    };

    const khaltiResp = await axios.post(
      `${KHALTI_BASE_URL}/epayment/initiate/`,
      payload,
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    await markPendingPayment({
      booking,
      method: "khalti",
      transactionId: purchaseOrderId,
      amount: finalAmount,
      discount,
      couponId: coupon?._id,
      pidx: khaltiResp.data.pidx,
    });

    return res.status(200).json({
      provider: "khalti",
      paymentUrl: khaltiResp.data.payment_url,
      pidx: khaltiResp.data.pidx,
      amount: finalAmount,
      discount,
    });
  } catch (error) {
    console.error(error?.response?.data || error);
    return res
      .status(500)
      .json({
        msg:
          error?.response?.data?.detail || "Failed to initiate Khalti payment",
      });
  }
};

const khaltiCallback = async (req, res) => {
  try {
    const { pidx, purchase_order_id: purchaseOrderId } = req.query;

    if (!pidx || !purchaseOrderId) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "khalti",
          message: "Missing Khalti callback parameters",
        }),
      );
    }

    const bookingId = String(purchaseOrderId).split("-")[0];
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "khalti",
          bookingId,
          message: "Booking not found",
        }),
      );
    }

    if (booking.paid) {
      return res.redirect(
        getFrontendResultUrl({
          status: "success",
          provider: "khalti",
          bookingId,
          message: "Payment already verified",
        }),
      );
    }

    if (!KHALTI_SECRET_KEY) {
      return res.redirect(
        getFrontendResultUrl({
          status: "failed",
          provider: "khalti",
          bookingId,
          message: "Khalti key missing on server",
        }),
      );
    }

    const lookupResp = await axios.post(
      `${KHALTI_BASE_URL}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const lookup = lookupResp.data;
    const lookupStatus = lookup?.status;

    if (lookupStatus === "Completed") {
      await markSuccessfulPayment({
        booking,
        amount: Number(booking.pendingAmount || 0),
        reference: lookup.transaction_id,
      });

      return res.redirect(
        getFrontendResultUrl({
          status: "success",
          provider: "khalti",
          bookingId,
          message: "Payment successful",
        }),
      );
    }

    await markFailedPayment(booking);
    return res.redirect(
      getFrontendResultUrl({
        status: "failed",
        provider: "khalti",
        bookingId,
        message: `Payment not complete (${lookupStatus || "unknown"})`,
      }),
    );
  } catch (error) {
    console.error(error?.response?.data || error);
    return res.redirect(
      getFrontendResultUrl({
        status: "failed",
        provider: "khalti",
        message: "Server error during Khalti verification",
      }),
    );
  }
};

module.exports = {
  checkout,
  initiateEsewaPayment,
  esewaCallback,
  esewaFailure,
  initiateKhaltiPayment,
  khaltiCallback,
};
