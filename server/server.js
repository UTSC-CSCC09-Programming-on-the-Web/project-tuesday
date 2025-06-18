import express from "express";
import cors from "cors";

const app = express();

// allow requests running on port 4200
var corsOptions = {
  origin: "http://localhost:4200" // This must match the frontend's URL
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
  res.json({ message: "hello from the backend!" });
});

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
