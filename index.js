require("dotenv").config();
const express = require("express");
const cors = require("cors");
// mongoDB
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Password
// mlssoQjNQv9w8LPZ;
// user
// cine - realm;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/?appName=Cluster0`;

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
    // Connect the client to the server
    await client.connect();
    const db = client.db("cine-realm");

    // Users Collection
    const usersCollection = db.collection("users");

    // Movies Collection
    const moviesCollection = db.collection("allMovies");

    // ---------------- USERS API ----------------

    // Get Users
    // app.get("/users", async (req, res) => {
    //   const email = req.query.email;
    //   const query = {};
    //   if (email) {
    //     query.userEmail = email;
    //   }
    //   const result = await usersCollection.find(query).toArray();
    //   res.json(result);
    // });
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email; // FIXED
      }
      const result = await usersCollection.find(query).toArray();
      res.json(result);
    });

    // Post User
    // app.post("/users", async (req, res) => {
    //   const newUser = req.body;
    //   const email = req.body.email;

    //   const existingUser = await usersCollection.findOne({ email });

    //   if (existingUser) {
    //     return res.json({ success: false, message: "User Already Exist" });
    //   }

    //   const result = await usersCollection.insertOne(newUser);
    //   res.json({ success: true, result });
    // });
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;

      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.json({ success: false, message: "User Already Exist" });
      }

      const result = await usersCollection.insertOne(newUser);
      res.json({ success: true, result });
    });

    // Update User Profile
    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const updatedData = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $set: updatedData },
        { upsert: true }
      );

      res.json({ message: "User profile updated", result });
    });

    // ---------------- MOVIES API ----------------

    // Get ALL Movies (Also Sorted )
    app.get("/allMovies", async (req, res) => {
      const movies = await moviesCollection
        .find()
        .sort({ release_date: -1 }) // ⭐ NEWEST FIRST
        .toArray();

      res.json(movies);
    });

    // Get a single movie by ID
    app.get("/allMovies/:id", async (req, res) => {
      const { id } = req.params;
      const { ObjectId } = require("mongodb");

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }

      const movie = await moviesCollection.findOne({ _id: new ObjectId(id) });

      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    });

    // Get Movies by User
    app.get("/moviesByUser", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).json({ message: "Email query missing" });
      }

      const query = { user_email: email };
      const movies = await moviesCollection.find(query).toArray();

      res.json(movies);
    });

    // Add Movie
    app.post("/allMovies", async (req, res) => {
      const movie = req.body;

      if (!movie.user_email) {
        return res.status(400).json({ message: "user_email is required!" });
      }

      // Add timestamp
      movie.createdAt = new Date();

      const result = await moviesCollection.insertOne(movie);
      res.json({ message: "Movie added successfully", result });
    });

    // Delete Movie
    app.delete("/allMovies/:id", async (req, res) => {
      const id = req.params.id;
      const { ObjectId } = require("mongodb");

      const result = await moviesCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 1) {
        res.json({ message: "Movie deleted successfully" });
      } else {
        res.status(404).json({ message: "Movie not found" });
      }
    });

    // Update Movie — FINAL WORKING VERSION
    app.put("/allMovies/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedMovie = req.body;
        const { ObjectId } = require("mongodb");

        const result = await moviesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedMovie }
        );

        if (result.modifiedCount === 0) {
          return res.json({ success: false, message: "Movie update failed" });
        }

        res.json({ success: true, message: "Movie updated successfully" });
      } catch (error) {
        console.log("Update Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // ---------------- MOVIES API END ----------------

    // MongoDB Ping
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Hey Jarif! Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Jarif!");
});

app.listen(port, () => {
  console.log(`CineRealm is listening on port ${port}`);
});
