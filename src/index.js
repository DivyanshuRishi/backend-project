// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})







connectDB()
.then(
    ()=>{
        app.on("error",(error)=>{
            console.log(`MONGODB connection failed due to ${error}`)
            throw error
        })
        app.listen(process.env.PORT || 8000,()=>{
            console.log(`App is listening on port : ${process.env.PORT}`)
        })
    }
)
.catch(
    (error)=>{
        console.log("MONGODB connection failed!!! ",error);
        
    }
)









/*

(async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
       app.on("error",(error)=>{
        console.error("Error connecting to MongoDB");
        throw error
       });
       app.listen(process.env.PORT,()=>{
        console.log(`App is listening on port : ${process.env.PORT}`)
       });
    } catch (error) {
        console.error("ERROR: ",error);
        throw error
        
    }
})()

*/