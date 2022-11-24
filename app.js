const path = require('path');
const fs = require('fs')
const https = require('https')
// const { MongoClient } = require('mongodb');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet')
const compression = require('compression');
const morgan = require('morgan');

const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');
const User = require('./models/user');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.5xymi.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`
const client = new MongoClient(MONGODB_URI)

const app = express();
const port = process.env.PORT || 3000

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
  destination : (req,file,cb) => {
    cb(null,'books')
  } ,
  filename : (req,file,cb) => {
    cb(null,file.originalname)
  }
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(multer({storage :fileStorage ,fileFilter: fileFilter }).single('book'))

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.setHeader("Content-Security-Policy", "script-src 'self' https://cdn.icon-icons.com/icons2/652/PNG/512/gmail_icon-icons.com_59877.png");
  return next();
});

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id).then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI)
    console.log('MongoDB connceted');
  }
  catch (error) {
    console.log(error);
    process.exit(1);
  }
}


// mongoose.connect(MONGODB_URI).then(result => {
//     // https.createServer({key: privateKey , cert: certificate},app).listen(process.env.PORT || 3000);
//   app.listen(port)
// }).then(result => console.log(result))
// .catch(err => {console.log(err)});


// client.connect(err => {
//   if(err) {
//     console.log(err)
//     return false;
//     app.listen(port,() => {
//       console.log('Server is running')
//     })
//   }
// })

connectDB().then(() => {
  app.listen(port,() => {
    console.log("Server Running")
  }) 
})