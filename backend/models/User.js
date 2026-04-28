const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { withIdTransform } = require('../utils/mongooseTransforms');

const userSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    employee_id: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    joining_date: {
      type: Date,
    },
    date_of_birth: {
      type: Date,
    },
    basic_salary: {
      type: Number,
      default: 0,
    },
    manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Please add a username'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
        'Please add a valid email',
      ],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [15, 'Phone number cannot exceed 15 digits'],
      match: [/^\+?\d{10,14}$/, 'Please add a valid phone number with optional country code'],
    },
    is_profile_complete: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    profile_photo: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: 'active',
      trim: true,
      index: true,
    },
    last_login: {
      type: Date,
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
    },
    login_blocked_until: {
      type: Date,
    },
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      weeklyDigest: {
        type: Boolean,
        default: false,
      },
    },
    is_trial: {
      type: Boolean,
      default: false,
    },
    is_demo: {
      type: Boolean,
      default: false,
    },
    trial_ends_at: {
      type: Date,
    },
    tags: [{
      type: String,
      trim: true
    }],
    date_of_birth: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);


// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

withIdTransform(userSchema);

module.exports = mongoose.model('User', userSchema);
