import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave : false})

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating Access and Refresh Token!")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, username } = req.body;

    console.log("Received data:", { fullName, email, password, username });

    if ([fullName, email, password, username].some((field) => field?.trim() === "" )) {
        throw new ApiError(400, "All fields are required!");
    }

    // Check if user already exists by username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(400, "User with email or username already exists!");
    }

    // Handle file uploads (avatar and cover image)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;
    // console.log(req);
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath=req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    // Ensure avatar was uploaded successfully
    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar");
    }

    // Create user object in the database
    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || ""  // Optional cover image
    });


    
    // Fetch created user without sensitive fields
    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken")
        // .lean();

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    console.log('Files:', req.files);
    console.log('User created:', createdUser);

    // Remove circular references (make sure not to send MongoClient or any circular object)
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully!")
    );
});

const loginUser = asyncHandler(async (req,res) => {
    // req body
    // email or username collect
    // find the user
    // password check
    // refreshtoken and access token
    //send cookie
    const { email, password, username } = req.body;

    if (!(username || email)) {
        throw new ApiError(400,"Username and email is required")
    }

    const user = await User.findOne({
        $or: [{ email }, { username: username.toLowerCase() }]
    })

    if (!user) {
        throw new ApiError(404,"User doesn`t exists!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials!")
        
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedinUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: loggedinUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

const options = {
    httpOnly: true,
    secure: true
}

return res.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(new ApiResponse(200,{},"User logged Out"))

})

const refreshAccessToken = asyncHandler (async (req,res) => 
    {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401,"Unauthorized Request")
        }

        try {
            const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
            const user = await User.findById(decodedToken?._id)
    
            if(!user) {
                throw new ApiError(401,"Invalid Refresh Token")
            }
    
            if (incomingRefreshToken !== user.refreshToken){
                throw new ApiError(401,"Invalid Refresh Token: Either it is expired or used")
            }
    
            const options = {
                httpOnly: true,
                secure: true,
            }
    
            const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
            return res.
            status(200).
            cookie("accessToken",accessToken,options).
            cookie("refreshToken",newRefreshToken,options).
            json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken : newRefreshToken},
                    "Access Token refreshed"
                )
            )
        } catch (error) {
            throw new ApiError(401,error?.message || "Invalid Refresh Token")
        }
    })

const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(401,"Old Password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
            .json(new ApiResponse(200,{},"Password changed"))
})

const getCurrentUser = asyncHandler(async (req,res)=> {
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current User fetched "))
})

const updateAccountDetails = asyncHandler(async (req,res)=> {
    const {fullName,email} = req.body

    if (!fullName || !email){
        throw new ApiError(400,"Please provide all fields")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated"))
})

const updateUserAvtaar = asyncHandler(async (req,res)=> {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated"))
})

const updateUserCoverImage = asyncHandler(async (req,res)=> {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image file")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image updated"))
})

const getUserChannelProfile = asyncHandler(async (req,res)=> {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }

    const channel = await User.aggregate(
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },{
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },{
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount : {
                    $size:"$subscribedTo"
                },
                isSubsctibed:{
                    $cond : {
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            },
            
        },{
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubsctibed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    )

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res.
    status(200).
    json(
        new ApiResponse(200,channel[0],"User channel fetched succesfully")
    )
})

const getWatchHistory = asyncHandler(async (req,res)=> {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },{
            $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    username:1,
                                    avatar:1,
                                    fullName:1,

                                }
                            },
                            {
                                $addFields:{
                                    $first:"$owner"
                                }
                            }
                        ]
                    }
                }
            ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,user[0].watchHistory,"User watch history fetched succesfully")
    )
})


export {
    changeCurrentPassword,
    getCurrentUser, getUserChannelProfile, loginUser,
    logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvtaar, updateUserCoverImage
};

