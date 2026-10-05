import Razorpay from "razorpay";

const createRazorpayInstance = (keyId, keySecret) =>
  new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

export default createRazorpayInstance;
