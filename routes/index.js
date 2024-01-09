var express = require('express');
var router = express.Router();


const userModel=require("./users");    //import db model from users.js
const postModel=require("./post");
const passport = require('passport');
const localStrategy= require("passport-local");
const upload=require("./multer");
const post = require('./post');

passport.use(new localStrategy(userModel.authenticate()));  //line for login...

router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.get('/login', function(req, res) {
  res.render('login', {footer: false});
});

router.get('/feed', isLoggedIn, async function(req, res) {
  const user=await userModel.findOne({username: req.session.passport.user});

  const posts = await postModel.find().populate("user"); //populate user jinki id hai
  res.render('feed', {footer: true, posts, user});
});

router.get('/profile',isLoggedIn, async function(req, res) {
  const user=await userModel.findOne({username: req.session.passport.user}).populate("posts");
  res.render('profile', {footer: true, user});
});

router.get('/search',isLoggedIn,  function(req, res) {
  res.render('search', {footer: true});
});

router.get('/like/post/:id',isLoggedIn, async function(req, res) {
  const user=await userModel.findOne({username: req.session.passport.user});
  const post=await postModel.findOne({_id: req.params.id});

 // if already liked removed like.... 
 // if not liked like it...
 if(post.likes.indexOf(user._id)=== -1){
        post.likes.push(user._id);
 }
 else{
  post.likes.splice(post.likes.indexOf(user._id),1);
 }

 await post.save();
 res.redirect("/feed");
});

router.get('/edit', isLoggedIn, async function(req, res) {
  const user=await userModel.findOne({username: req.session.passport.user}); //to  show data in edit page...
  res.render('edit', {footer: true, user });
});

router.get('/upload', isLoggedIn, function(req, res) {
  res.render('upload', {footer: true});
});

// implementaion of search functionality here using regex

router.get('/username/:username',isLoggedIn, async function(req, res) {
  const regex =new RegExp(`^${req.params.username}`, 'i');
  const users=await userModel.find({username: regex});
  res.json(users);
});


router.post("/register", function(req,res,next){
  const userData= new userModel({
    username: req.body.username,        //ye username(naam ) index.js(views) se aaya hai kyuki /page me 
  name: req.body.name,                  //vhi render ho rhi thi....
  email: req.body.email,
  });

  userModel.register(userData, req.body.password)    //password ko yha bhejenge..taki dikhe naa
  .then(function(){
         passport.authenticate("local")(req, res, function(){
          res.redirect("/profile");
         })
  })
});


router.post('/login',passport.authenticate("local",{                //login code
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function(req, res) {
});


router.get('/logout', function(req, res,next) {     //logout code
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


//yha user updat ho gya hoga..

router.post('/update', upload.single('image') , async function(req, res){
 const user= await userModel.findOneAndUpdate(
  {username:req.session.passport.user},
  {username: req.body.username, name: req.body.name, bio: req.body.bio},
  {new: true}
  );     // login user find kar liya jiska data edit karna hai

  if(req.file){
    user.profileImage=req.file.filename;
  }
  await user.save();
  res.redirect("/profile");
});


router.post("/upload", isLoggedIn, upload.single("image"),async function(req,res){
  const user=await userModel.findOne({username: req.session.passport.user}); 

  const post=await postModel.create({
    picture: req.file.filename,
    user:user._id,
    caption: req.body.caption
  })

  user.posts.push(post._id);  //userjs ke andar post update kar do
  await user.save();
  res.redirect("/feed");
  
});


function isLoggedIn(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect("/login");
}


module.exports = router;
