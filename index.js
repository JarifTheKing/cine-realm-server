require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectDB() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully!");

    const db = client.db("cine-realm");
    const usersCollection = db.collection("users");
    const moviesCollection = db.collection("allMovies");

    // ---------------- USERS API ----------------

    // GET USERS
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      const result = await usersCollection.find(query).toArray();
      res.json(result);
    });

    // POST USER
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

    // UPDATE USER PROFILE
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

    // GET ALL MOVIES
    app.get("/allMovies", async (req, res) => {
      const movies = await moviesCollection
        .find()
        .sort({ release_date: -1 })
        .toArray();

      res.json(movies);
    });

    // GET MOVIE BY ID
    app.get("/allMovies/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }

      const movie = await moviesCollection.findOne({ _id: new ObjectId(id) });

      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    });

    // GET MOVIES BY USER
    app.get("/moviesByUser", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).json({ message: "Email query missing" });
      }

      const movies = await moviesCollection
        .find({ user_email: email })
        .toArray();
      res.json(movies);
    });

    // ADD MOVIE
    app.post("/allMovies", async (req, res) => {
      const movie = req.body;

      if (!movie.user_email) {
        return res.status(400).json({ message: "user_email is required!" });
      }

      movie.createdAt = new Date();

      const result = await moviesCollection.insertOne(movie);
      res.json({ message: "Movie added successfully", result });
    });

    // DELETE MOVIE
    app.delete("/allMovies/:id", async (req, res) => {
      const id = req.params.id;

      const result = await moviesCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 1) {
        res.json({ message: "Movie deleted successfully" });
      } else {
        res.status(404).json({ message: "Movie not found" });
      }
    });

    // UPDATE MOVIE
    app.put("/allMovies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedMovie = req.body;

        const result = await moviesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedMovie }
        );

        if (result.modifiedCount === 0) {
          return res.json({ success: false, message: "Movie update failed" });
        }

        res.json({ success: true, message: "Movie updated successfully" });
      } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // ROOT
    app.get("/", (req, res) => {
      res.send("CineRealm Backend is Running!");
    });
  } catch (error) {
    console.error("DB Connection Error:", error);
  }
}

connectDB();

// Vercel needs this export (NO app.listen)
module.exports = app;
