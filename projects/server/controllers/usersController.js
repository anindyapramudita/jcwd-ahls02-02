const fs = require("fs");
const { dbQuery } = require('../config/database')
const { hashPassword, createToken } = require('../config/encription')
const { transporter } = require("../config/nodemailer")

module.exports = {
  userData: async (req, res, next) => {
    try {
      // let allUserData = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users;`)
      let allUserData = await dbQuery(`Select email from users;`)
      return res.status(200).send(allUserData)
    } catch (error) {
      return next(error)
    }
  },
  tokenData: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let result = await dbQuery(`Select name, token_verification, token_reset from users where id = '${req.dataUser.id}';`)

        // let { id, role, name, email, phone_number } = result[0]
        // let token = createToken({ id, role, name, email, phone_number })
        return res.status(200).send(result[0])
      } else {
        return res.status(401).send({
          success: false,
          message: "Token expired"
        })
      }
    } catch (error) {
      return next(error);
    }
  },
  register: async (req, res, next) => {
    try {

      const { name, email, phone_number, password } = req.body;

      let insertData = await dbQuery(`Insert into users (name, email, phone_number, password) values ('${name}', '${email}', '${phone_number}', '${hashPassword(password)}');`)

      if (insertData.insertId) {
        let result = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id='${insertData.insertId}';`)

        let { id, role, name, email, phone_number } = result[0]

        let token = createToken({ id, role, name, email, phone_number })

        await dbQuery(`Update users set token_verification = '${token}' WHERE id=${insertData.insertId};`)

        let verificationEmail = fs.readFileSync('./mail/verification.html').toString()

        verificationEmail = verificationEmail.replace('#name', name)
        verificationEmail = verificationEmail.replace('#token', `${process.env.FE_URL}/auth/verification/${token}`)

        await transporter.sendMail({
          from: "LifeServe Admin",
          to: email,
          subject: "Email Verification",
          html: `${verificationEmail}`
        })

        return res.status(200).send({ ...result[0], token })
      } else {
        return res.status(404).send({
          success: false,
          message: "User not found"
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body
      let result = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where email='${email}' and password='${hashPassword(password)}';`)
      if (result.length == 1) {
        let { id, role, name, email, phone_number } = result[0]
        let token = createToken({ id, role, name, email, phone_number })
        return res.status(200).send({ ...result[0], token })
      } else {
        let checkEmail = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where email='${email}';`)
        if (checkEmail.length == 1) {
          return res.status(404).send({
            success: false,
            message: "Password Incorrect"
          });
        } else {
          return res.status(404).send({
            success: false,
            message: "User not found"
          });
        }
      }
    } catch (error) {
      return next(error);
    }
  },
  keepLogin: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let result = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id = '${req.dataUser.id}';`)

        let { id, role, name, email, phone_number } = result[0]
        let token = createToken({ id, role, name, email, phone_number })
        return res.status(200).send({ ...result[0], token })
      } else {
        return res.status(401).send({
          success: false,
          message: "Token expired"
        })
      }
    } catch (error) {
      return next(error);
    }
  },
  verifyAccount: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let token = await dbQuery(`select token_verification from users WHERE id = ${req.dataUser.id}`)

        if (req.token == token[0].token_verification) {
          await dbQuery(`UPDATE users SET verified_status = 'verified' WHERE id = ${req.dataUser.id}`)
          let result = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id = '${req.dataUser.id}';`)

          let { id, role, name, email, phone_number } = result[0]

          let finalToken = createToken({ id, role, name, email, phone_number })

          await dbQuery(`Update users set token_verification = '' WHERE id=${req.dataUser.id};`)

          return res.status(200).send({ ...result[0], finalToken })
        } else {
          return res.status(404).send({
            success: false,
            message: "Token expired"
          })
        }
      } else {
        return res.status(404).send({
          success: false,
          message: "User not found"
        })
      }
    } catch (error) {
      return next(error);
    }
  },
  // resend verification email
  resendVerification: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // send reset/forgot password  link
  forgotPassword: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // when user wants to reset password after click reset/forgot password link
  resendVerification: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // get user profile data
  userProfile: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // edit user general info
  editProfile: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  editProfilePicture: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // change password via profile page (needs to input old password for confirmation)
  changePassword: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // get user profile data
  addAddress: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // TBD apakah add & edit bisa jadi 1
  editAddress: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  deleteAddress: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },

  getUserCart: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  addProductToCart: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  editProductInCart: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  deleteProductInCart: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  getOrderList: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // when users checkouts products OR
  addOrder: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // updates order status, send status_before and status_after
  updateOrder: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  deleteOrder: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  uploadPaymentReceipt: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  // get user prescription list
  getPrescriptionList: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
  uploadPrescription: async (req, res, next) => {
    try {
    } catch (error) {
      return next(error);
    }
  },
};
