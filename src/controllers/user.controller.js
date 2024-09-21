import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandlers.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const registerUser = asyncHandler(async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists - userName , email
    // check for images and avtaar
    // upload them to cloudinary {avtaar}
    // create user object - create entry in db
    // remove password and refreshToken field from response
    // check for user creation
    // return res


    const {fullName,email,password,username} = req.body
    console.log("email:",email)


    if ([fullName,email,password,username].some((fields)=>
        fields?.trim()===""
    )) {
        throw new ApiError(400,"All fields are reuired!")
    }

    const existedUser = User.findOne({
        $or: [{ username },{ email }]
    })
    if (existedUser) {
        throw new ApiError(400,"User with email or userName already exists!")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
        
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
        
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username:username.toLowerCase(),
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
        })
    
    const createdUser = User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the User")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Succesfully!")
    )

})

export { registerUser }
