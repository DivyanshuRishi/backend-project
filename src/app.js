import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";



const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes import
import userRoutes from "./routes/user.routes.js";


// routes declration

app.use("/api/v1/users",userRoutes)


// https://localhost:8000/api/v1/users/register





export { app };
