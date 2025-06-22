const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI with env variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.70dnixi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // MongoDB Collection
    const jobsCollection = client.db("jobsDB").collection("jobs");
    const applicationsCollection = client.db("jobsDB").collection("applications");

    // Post job API
    app.post("/jobs", async (req, res) => {
      try {
        const jobData = req.body;

        // Add created timestamp
        const currentDate = new Date();
        jobData.createdAt = {
          date: currentDate.toISOString().split("T")[0],
          time: currentDate.toTimeString().split(" ")[0],
        };

        const result = await jobsCollection.insertOne(jobData);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error("Error posting job:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    // GET all job posts
app.get("/jobs", async (req, res) => {
  try {
    const jobs = await jobsCollection.find().toArray();
    res.send(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).send({ success: false, message: "Failed to fetch jobs" });
  }
});

// DELETE job by ID
app.delete('/jobs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post("/apply", async (req, res) => {
  try {
    const application = req.body;

    // Add timestamp
    application.createdAt = new Date();

    const result = await applicationsCollection.insertOne(application);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error("Error saving application:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/applications", async (req, res) => {
  try {
    const { jobId } = req.query;
    const query = jobId ? { jobId: jobId } : {};
    const applications = await applicationsCollection.find(query).toArray();
    res.status(200).json(applications);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Server error" });
  }
});




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

//server test code...
app.get("/", (req, res) => {
  res.send("server is running...");
});

app.listen(port, () => {
  console.log(`server is Running on port ${port}`);
});
