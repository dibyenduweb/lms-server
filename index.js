const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion,ObjectId  } = require("mongodb");
const crypto = require("crypto");
const Razorpay = require("razorpay");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mongo URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xkjrqdc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: 'rzp_test_U4sMnCIiE6tjgO', // Your Razorpay Key ID
  key_secret: 'Ax0dB8jT0hE2aDjZ4ScTQMo2' // Your Razorpay Key Secret
});



// Main
async function run() {
  try {
    await client.connect(); // ✅ CONNECT TO MONGO

    const coursesCollection = client.db("coursesDB").collection("courses");
    const enrollCollection = client.db("coursesDB").collection("enroll");


    // POST /courses
    app.post("/courses", async (req, res) => {
      console.log("📨 Incoming POST body:", JSON.stringify(req.body, null, 2));
      try {
        const courseData = req.body;

        const currentDate = new Date();
        courseData.createdAt = {
          date: currentDate.toISOString().split("T")[0],
          time: currentDate.toTimeString().split(" ")[0],
        };

        const result = await coursesCollection.insertOne(courseData);
        console.log("✅ Inserted with ID:", result.insertedId);

        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error("❌ Error posting course:", error);
        res.status(500).send({ success: false, message: "Internal Server Error" });
      }
    });


    // GET all courses
app.get("/courses", async (req, res) => {
  try {
    const courses = await coursesCollection.find().toArray();
    res.status(200).send(courses);
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    res.status(500).send({ success: false, message: "Failed to fetch courses" });
  }
});

app.delete("/courses/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await coursesCollection.deleteOne({ _id: new ObjectId(id) }); // 👈 Here
    if (result.deletedCount > 0) {
      res.send({ success: true, message: "Course deleted successfully" });
    } else {
      res.status(404).send({ success: false, message: "Course not found" });
    }
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

app.put("/courses/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = { ...req.body };
  delete updatedData._id; // ❗ Avoid MongoDB error when updating

  try {
    const result = await coursesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Course updated successfully" });
    } else {
      res.status(404).send({ success: false, message: "Course not found or not updated" });
    }
  } catch (error) {
    console.error("❌ Error updating course:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

app.get("/courses/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
    if (!course) {
      return res.status(404).send({ success: false, message: "Course not found" });
    }
    res.send(course);
  } catch (error) {
    console.error("Error getting course:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});


// Enrolldata
// ✅ Use app.post instead of router.post
app.post("/enroll", async (req, res) => {
  const { courseId, name, email } = req.body;

  if (!courseId || !name || !email) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const enrollCollection = client.db("coursesDB").collection("enroll");
    await enrollCollection.insertOne({ courseId, name, email });

    res.json({ success: true, message: "Enrollment successful" });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Enroll Get
// GET all enrollment data
app.get("/enroll", async (req, res) => {
  try {
    const enrollCollection = client.db("coursesDB").collection("enroll");
    const enrollments = await enrollCollection.find().toArray();

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    console.error("❌ Error fetching enrollments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/create-order', async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: req.body.amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID // Make sure this is set
    });
    
  } catch (err) {
    console.error('Razorpay error:', err.error || err);
    res.status(500).json({ 
      error: err.error?.description || 'Payment processing failed' 
    });
  }
});

    // app.post('/verify-payment', async (req, res) => {
    //   const { razorpay_payment_id, razorpay_order_id, razorpay_signature, courseId, name, email } = req.body;
      
    //   const generated_signature = crypto.createHmac('sha256', 'Ax0dB8jT0hE2aDjZ4ScTQMo2')
    //     .update(razorpay_order_id + "|" + razorpay_payment_id)
    //     .digest('hex');
      
    //   if (generated_signature === razorpay_signature) {
    //     // Save enrollment details to your database
    //     try {
    //       await enrollCollection.insertOne({ 
    //         courseId,
    //         name,
    //         email,
    //         paymentId: razorpay_payment_id,
    //         orderId: razorpay_order_id,
    //         paymentDate: new Date()
    //       });
          
    //       res.json({ success: true });
    //     } catch (dbError) {
    //       console.error("Database save error:", dbError);
    //       res.status(500).json({ success: false, message: "Database error" });
    //     }
    //   } else {
    //     res.json({ success: false, message: "Payment verification failed" });
    //   }
    // });


// Updated verify-payment endpoint
app.post('/verify-payment', async (req, res) => {
  const { 
    razorpay_payment_id, 
    razorpay_order_id, 
    razorpay_signature,
    courseId,
    name,
    email,
    amount
  } = req.body;

  try {
    // For free courses (amount = 0)
    if (amount === 0) {
      await enrollCollection.insertOne({
        courseId,
        name,
        email,
        enrollmentDate: new Date(),
        status: "free",
        payment: {
          amount: 0,
          method: "free"
        }
      });
      return res.json({ success: true });
    }

    // For paid courses
    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      await enrollCollection.insertOne({
        courseId,
        name,
        email,
        enrollmentDate: new Date(),
        status: "paid",
        payment: {
          amount: amount / 100, // Convert back to rupees
          method: "razorpay",
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id
        }
      });
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ success: false });
  }
});


















    console.log("✅ MongoDB connected and route registered");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
run().catch(console.dir);

// Test Route
app.get("/", (req, res) => {
  res.send("server is running...");
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server is Running on port ${port}`);
});
