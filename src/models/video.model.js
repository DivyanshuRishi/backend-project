import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
    {
        videoFile:{
            type: String, //Cloudinary Url
            required: true
        }
        ,thumbnail:{
            type: String, //Cloudinary Url
            required: true
        }
        ,title:{
            type: String,
            required: true
        }
        ,description:{
            type: String,
            required: true
        }
        ,duration:{
            type: Number,
            required: true
        }
        ,views:{
            type: Number,
            default:0
        }
        ,isPublished:{
            type: Boolean,
            default:true
        }
        ,owner:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
)

mongoose.plugin(mongooseAggregatePaginate)




export const Video = mongoose.model("Video",videoSchema)