import express from "express";
import Stripe from "stripe";
import passport from "passport";
import pool from "../database.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create subscription
router.post(
  "/create-subscription",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      // Create or get Stripe customer
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        customerId = customer.id;

        // Update user with customer ID
        const client = await pool.connect();
        await client.query(
          "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
          [customerId, user.id],
        );
        client.release();
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: process.env.STRIPE_PRICE_ID, // Your monthly subscription price ID
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      });

      // Update user with subscription info
      const client = await pool.connect();
      await client.query(
        "UPDATE users SET subscription_id = $1, subscription_status = $2 WHERE id = $3",
        [subscription.id, subscription.status, user.id],
      );
      client.release();

      res.json({
        success: true,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      });
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create subscription",
      });
    }
  },
);

// Update payment method
router.post(
  "/update-payment-method",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      const user = req.user;

      // Create or get Stripe customer
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        customerId = customer.id;

        // Update user with customer ID
        const client = await pool.connect();
        await client.query(
          "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
          [customerId, user.id],
        );
        client.release();
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // If user has a subscription, update its default payment method
      if (user.subscription_id) {
        await stripe.subscriptions.update(user.subscription_id, {
          default_payment_method: paymentMethodId,
        });

        // Update subscription status to active if it was past_due, incomplete, or canceled
        if (
          user.subscription_status === "past_due" ||
          user.subscription_status === "incomplete" ||
          user.subscription_status === "canceled"
        ) {
          // For canceled subscriptions, we need to reactivate them
          if (user.subscription_status === "canceled") {
            await stripe.subscriptions.update(user.subscription_id, {
              cancel_at_period_end: false,
            });
          }

          const client = await pool.connect();
          await client.query(
            "UPDATE users SET subscription_status = $1 WHERE id = $2",
            ["active", user.id],
          );
          client.release();
        }
      } else {
        // User doesn't have a subscription yet, create one
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [
            {
              price: process.env.STRIPE_PRICE_ID,
            },
          ],
          default_payment_method: paymentMethodId,
        });

        // Update user with subscription info
        const client = await pool.connect();
        await client.query(
          "UPDATE users SET subscription_id = $1, subscription_status = $2 WHERE id = $3",
          [subscription.id, subscription.status, user.id],
        );
        client.release();
      }

      res.json({
        success: true,
        message: "Payment method updated successfully",
      });
    } catch (error) {
      console.error("Update payment method error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment method",
      });
    }
  },
);

// Cancel subscription
router.post(
  "/cancel-subscription",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user.subscription_id) {
        return res.status(400).json({
          success: false,
          message: "No active subscription found",
        });
      }

      // Cancel subscription at period end
      await stripe.subscriptions.update(user.subscription_id, {
        cancel_at_period_end: true,
      });

      // Update user subscription status
      const client = await pool.connect();
      await client.query(
        "UPDATE users SET subscription_status = $1 WHERE id = $2",
        ["canceled", user.id],
      );
      client.release();

      res.json({
        success: true,
        message: "Subscription canceled successfully",
      });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel subscription",
      });
    }
  },
);

// Resume subscription
router.post(
  "/resume-subscription",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user.subscription_id) {
        return res.status(400).json({
          success: false,
          message: "No subscription found",
        });
      }

      // Resume subscription
      await stripe.subscriptions.update(user.subscription_id, {
        cancel_at_period_end: false,
      });

      // Update user subscription status
      const client = await pool.connect();
      await client.query(
        "UPDATE users SET subscription_status = $1 WHERE id = $2",
        ["active", user.id],
      );
      client.release();

      res.json({
        success: true,
        message: "Subscription resumed successfully",
      });
    } catch (error) {
      console.error("Resume subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resume subscription",
      });
    }
  },
);

// Confirm subscription payment
router.post(
  "/confirm-subscription-payment",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user.subscription_id) {
        return res.status(400).json({
          success: false,
          message: "No subscription found",
        });
      }

      // Get subscription from Stripe to check its status
      const subscription = await stripe.subscriptions.retrieve(
        user.subscription_id,
      );

      // Update user subscription status based on Stripe subscription status
      const client = await pool.connect();
      await client.query(
        "UPDATE users SET subscription_status = $1 WHERE id = $2",
        [subscription.status, user.id],
      );
      client.release();

      res.json({
        success: true,
        subscriptionStatus: subscription.status,
        message: "Subscription status updated",
      });
    } catch (error) {
      console.error("Confirm subscription payment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm subscription payment",
      });
    }
  },
);

// Stripe webhook handler
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const client = await pool.connect();

      // Handle the event
      switch (event.type) {
        case "invoice.payment_succeeded":
          const invoice = event.data.object;
          if (invoice.subscription) {
            await client.query(
              "UPDATE users SET subscription_status = $1 WHERE subscription_id = $2",
              ["active", invoice.subscription],
            );
            console.log(
              `Subscription ${invoice.subscription} activated via payment success`,
            );
          }
          break;

        case "invoice.payment_failed":
          const failedInvoice = event.data.object;
          if (failedInvoice.subscription) {
            await client.query(
              "UPDATE users SET subscription_status = $1 WHERE subscription_id = $2",
              ["past_due", failedInvoice.subscription],
            );
            console.log(
              `Subscription ${failedInvoice.subscription} marked as past due`,
            );
          }
          break;

        case "customer.subscription.updated":
          const updatedSubscription = event.data.object;
          let status = updatedSubscription.status;

          // Handle cancel_at_period_end changes
          if (updatedSubscription.cancel_at_period_end && status === "active") {
            status = "canceled";
          } else if (
            !updatedSubscription.cancel_at_period_end &&
            status === "active"
          ) {
            status = "active";
          }

          await client.query(
            "UPDATE users SET subscription_status = $1 WHERE subscription_id = $2",
            [status, updatedSubscription.id],
          );
          console.log(
            `Subscription ${updatedSubscription.id} updated to status: ${status}`,
          );
          break;

        case "customer.subscription.deleted":
          const deletedSubscription = event.data.object;
          await client.query(
            "UPDATE users SET subscription_status = $1 WHERE subscription_id = $2",
            ["canceled", deletedSubscription.id],
          );
          console.log(`Subscription ${deletedSubscription.id} deleted`);
          break;

        case "customer.subscription.created":
          const createdSubscription = event.data.object;
          await client.query(
            "UPDATE users SET subscription_status = $1 WHERE subscription_id = $2",
            [createdSubscription.status, createdSubscription.id],
          );
          console.log(
            `Subscription ${createdSubscription.id} created with status: ${createdSubscription.status}`,
          );
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Log the event
      await client.query(
        "INSERT INTO subscription_events (event_type, stripe_event_id, data) VALUES ($1, $2, $3)",
        [event.type, event.id, JSON.stringify(event.data)],
      );

      client.release();
    } catch (error) {
      console.error("Webhook handling error:", error);
      return res.status(500).send("Webhook handling failed");
    }

    res.json({ received: true });
  },
);

export default router;
