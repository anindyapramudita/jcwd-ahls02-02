const fs = require("fs");
const { dbConf, dbQuery } = require("../config/database");
const { hashPassword, createToken } = require("../config/encription");
const { uploader } = require("../config/uploader");
const { transporter } = require("../config/nodemailer");
const crypto = require("crypto");

module.exports = {
  userData: async (req, res, next) => {
    try {
      // let allUserData = await dbQuery(`Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users;`)
      let allUserData = await dbQuery(`Select email from users;`);
      return res.status(200).send(allUserData);
    } catch (error) {
      return next(error);
    }
  },
  tokenData: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let result = await dbQuery(
          `Select name, token_verification, token_reset from users where id = '${req.dataUser.id}';`
        );

        // let { id, role, name, email, phone_number } = result[0]
        // let token = createToken({ id, role, name, email, phone_number })
        return res.status(200).send(result[0]);
      } else {
        return res.status(401).send({
          success: false,
          message: "Token expired",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  register: async (req, res, next) => {
    try {
      const { name, email, phone_number, password } = req.body;

      let insertData = await dbQuery(
        `Insert into users (name, email, phone_number, password) values ('${name}', '${email}', '${phone_number}', '${hashPassword(
          password
        )}');`
      );

      if (insertData.insertId) {
        let result = await dbQuery(
          `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id='${insertData.insertId}';`
        );

        let { id, role, name, email, phone_number } = result[0];

        let token = createToken({ id, role, name, email, phone_number });

        await dbQuery(
          `Update users set token_verification = '${token}' WHERE id=${insertData.insertId};`
        );

        let verificationEmail = fs
          .readFileSync("./mail/verification.html")
          .toString();

        verificationEmail = verificationEmail.replace("#name", name);
        verificationEmail = verificationEmail.replace(
          "#token",
          `${process.env.FE_URL}/auth/verification/${token}`
        );

        await transporter.sendMail({
          from: "LifeServe Admin",
          to: email,
          subject: "Email Verification",
          html: `${verificationEmail}`,
        });

        return res.status(200).send({ ...result[0], token });
      } else {
        return res.status(404).send({
          success: false,
          message: "User not found",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      let result = await dbQuery(
        `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where email='${email}' and password='${hashPassword(
          password
        )}';`
      );
      if (result.length == 1) {
        let { id, role, name, email, phone_number } = result[0];
        const userAddress = await dbQuery(
          `select id, street, province_id, province_label, city_id, city_label, postal_code, default_address from address where id_user = ${id}`
        );
        let token = createToken({ id, role, name, email, phone_number });
        return res
          .status(200)
          .send({ ...result[0], token, address: [...userAddress] });
      } else {
        let checkEmail = await dbQuery(
          `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where email='${email}';`
        );
        if (checkEmail.length == 1) {
          return res.status(404).send({
            success: false,
            message: "Password Incorrect",
          });
        } else {
          return res.status(404).send({
            success: false,
            message: "User not found",
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
        let result = await dbQuery(
          `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id = '${req.dataUser.id}';`
        );
        const userAddress = await dbQuery(
          `select id, street, province_id, province_label, city_id, city_label, postal_code, default_address from address where id_user = ${req.dataUser.id}`
        );

        let { id, role, name, email, phone_number } = result[0];
        let token = createToken({ id, role, name, email, phone_number });
        return res
          .status(200)
          .send({ ...result[0], token, address: [...userAddress] });
      } else {
        return res.status(401).send({
          success: false,
          message: "Token expired",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  verifyAccount: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let token = await dbQuery(
          `select token_verification from users WHERE id = ${req.dataUser.id}`
        );

        if (req.token == token[0].token_verification) {
          await dbQuery(
            `UPDATE users SET verified_status = 'verified' WHERE id = ${req.dataUser.id}`
          );
          let result = await dbQuery(
            `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id = '${req.dataUser.id}';`
          );

          let { id, role, name, email, phone_number } = result[0];

          let finalToken = createToken({ id, role, name, email, phone_number });

          await dbQuery(
            `Update users set token_verification = '${finalToken}' WHERE id=${req.dataUser.id};`
          );

          return res.status(200).send({ ...result[0], finalToken });
        } else {
          return res.status(404).send({
            success: false,
            message: "Token expired",
          });
        }
      } else {
        return res.status(404).send({
          success: false,
          message: "User not found",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // resend verification email
  resendVerification: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let result = await dbQuery(
          `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id='${req.dataUser.id}';`
        );
        console.log(result);
        let { id, role, name, email, phone_number } = result[0];

        let token = createToken({ id, role, name, email, phone_number });

        await dbQuery(
          `Update users set token_verification = '${token}' WHERE id=${req.dataUser.id};`
        );

        let verificationEmail = fs
          .readFileSync("./mail/verification.html")
          .toString();

        verificationEmail = verificationEmail.replace("#name", name);
        verificationEmail = verificationEmail.replace(
          "#token",
          `${process.env.FE_URL}/auth/verification/${token}`
        );

        await transporter.sendMail({
          from: "LifeServe Admin",
          to: email,
          subject: "Email Verification",
          html: `${verificationEmail}`,
        });

        return res.status(200).send({ ...result[0], token });
      } else {
        return res.status(401).send({
          success: false,
          message: "Token expired",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // send reset/forgot password  link
  forgotPassword: async (req, res, next) => {
    try {
      let data = await dbQuery(
        `Select id, role, name, phone_number, email from users where email='${req.body.email}';`
      );

      let { id, role, name, email, phone_number } = data[0];
      let token = createToken({ id, role, name, email, phone_number });

      await dbQuery(
        `Update users set token_reset = '${token}' WHERE email='${req.body.email}';`
      );
      let finalResult = dbQuery(
        `Select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where email='${req.body.email}';`
      );

      let resetPassword = fs
        .readFileSync("./mail/resetPassword.html")
        .toString();

      resetPassword = resetPassword.replace("#fullname", name);
      resetPassword = resetPassword.replace(
        "#token",
        `${process.env.FE_URL}/auth/reset/${token}`
      );

      await transporter.sendMail({
        from: "Lifeserve Admin",
        to: email,
        subject: "Reset Password",
        html: `${resetPassword}`,
      });
      return res.status(200).send({ ...finalResult[0], token });
    } catch (error) {
      return next(error);
    }
  },
  // when user wants to reset password after click reset/forgot password link
  resetPassword: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        await dbQuery(
          `Update users set password='${hashPassword(
            req.body.password
          )}', token_reset = '' WHERE id=${req.dataUser.id}`
        );

        return res.status(200).send({
          success: true,
          message: "Password reset success",
        });
      } else {
        return res.status(401).send({
          success: false,
          message: "Token expired",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // get user profile data
  userProfile: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const resUser = await dbQuery(
          `select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id=${req.dataUser.id}`
        );
        return res.status(200).send({
          success: true,
          message: "User data fetched successfully",
          data: resUser[0],
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // edit user general info
  editProfile: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const userData = await dbQuery(
          `select * from users where id = ${req.dataUser.id}`
        );

        let editScript = "";
        for (userProp in userData[0]) {
          for (dataProp in req.body) {
            if (userProp == dataProp) {
              editScript += `${userProp} = ${dbConf.escape(
                req.body[dataProp]
              )}, `;
            }
          }
        }
        // remove ,
        editScript = editScript.substring(0, editScript.length - 2);

        await dbQuery(
          `update users set ${editScript} where id = ${req.dataUser.id};`
        );

        const newUserData = await dbQuery(
          `select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id = ${req.dataUser.id}`
        );

        const {
          id,
          role,
          verified_status,
          name,
          email,
          phone_number,
          profile_picture,
          birthdate,
          gender,
        } = newUserData[0];

        const newToken = createToken({
          id,
          role,
          name,
          email,
          phone_number,
        });

        return res.status(200).send({
          success: true,
          message: "User data updated successfully",
          data: newUserData[0],
          token: newToken,
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  editProfilePicture: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const uploadFile = uploader("/imgUsers", "IMGUSERS").array("image", 1);
        uploadFile(req, res, async (error) => {
          try {
            //remove from directory if user have profile_picture
            try {
              const currentPicture = await dbQuery(
                `select profile_picture from users where id=${req.dataUser.id}`
              );
              if (currentPicture[0].profile_picture) {
                fs.unlinkSync(`./public/${currentPicture[0].profile_picture}`);
              }
            } catch (error) {
              return next(error);
            }

            const newFileName = req.files[0]
              ? `'/imgUsers/${req.files[0].filename}'`
              : null;

            const changePicture = await dbQuery(
              `update users set profile_picture=${newFileName} where id=${req.dataUser.id};`
            );

            if (changePicture) {
              const newUserData = await dbQuery(
                `select id, role, verified_status, name, email, phone_number, profile_picture, birthdate, gender from users where id = ${req.dataUser.id}`
              );

              const {
                id,
                role,
                verified_status,
                name,
                email,
                phone_number,
                profile_picture,
                birthdate,
                gender,
              } = newUserData[0];

              const newToken = createToken({
                id,
                role,
                name,
                email,
                phone_number,
              });

              return res.status(200).send({
                success: true,
                message: "Profile picture successfully updated!",
                data: newUserData[0],
                token: newToken,
              });
            }
          } catch (error) {
            return next(error);
          }
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // change password via profile page (needs to input old password for confirmation)
  changePassword: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        let password = hashPassword(req.body.data.password);
        let newPassword = hashPassword(req.body.data.newPassword);

        const userData = await dbQuery(
          `select password from users where id=${req.dataUser.id}`
        );

        if (userData[0].password !== password) {
          return res.status(200).send({
            success: false,
            message: "Your old password does not match",
          });
        } else {
          await dbQuery(
            `Update users set password='${newPassword}' where id = ${req.dataUser.id};`
          );
          return res.status(200).send({
            success: true,
            message: "Password updated successfully",
          });
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // get user profile data
  addAddress: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const {
          street,
          province_id,
          province_label,
          city_id,
          city_label,
          postal_code,
        } = req.body;

        await dbQuery(
          `insert into address (id_user, street, province_id, province_label, city_id, city_label, postal_code) values ('${
            req.dataUser.id
          }', '${street}','${Number(
            province_id
          )}','${province_label}','${Number(
            city_id
          )}','${city_label}', '${Number(postal_code)}')`
        );

        const userAddress = await dbQuery(
          `select id, street, province_id, province_label, city_id, city_label, postal_code, default_address from address where id_user = ${req.dataUser.id}`
        );

        return res.status(200).send({
          success: true,
          message: "Address inserted successfully",
          data: userAddress,
        });
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  // TBD apakah add & edit bisa jadi 1
  editAddress: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const { addressId } = req.body;

        const addressData = await dbQuery(
          `select * from address where id_user = ${req.dataUser.id}`
        );

        let editScript = "";
        for (addressProp in addressData[0]) {
          for (dataProp in req.body) {
            if (addressProp == dataProp) {
              editScript += `${addressProp} = ${dbConf.escape(
                req.body[dataProp]
              )}, `;
            }
          }
        }
        // remove ,
        editScript = editScript.substring(0, editScript.length - 2);

        const updateAddress = await dbQuery(
          `update address set ${editScript} where id = ${addressId};`
        );

        if (updateAddress.affectedRows) {
          const userAddress = await dbQuery(
            `select id, street, province_id, province_label, city_id, city_label, postal_code, default_address from address where id_user = ${req.dataUser.id}`
          );

          return res.status(200).send({
            success: true,
            message: "Address successfully updated",
            data: userAddress,
          });
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  editDefaultAddress: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        // delete current default address
        const currentDefault = await dbQuery(
          `select * from address where id_user=${req.dataUser.id} and default_address="true"`
        );

        if (currentDefault.length) {
          await dbQuery(
            `update address set default_address = 'false' where id=${currentDefault[0].id}`
          );
        }

        // set new default address

        const setDefaultAddress = await dbQuery(
          `update address set default_address = 'true' where id=${req.body.addressId}`
        );

        if (setDefaultAddress.affectedRows) {
          const userAddress = await dbQuery(
            `select id, street, province_id, province_label, city_id, city_label, postal_code, default_address from address where id_user = ${req.dataUser.id}`
          );

          return res.status(200).send({
            success: true,
            message: "Address successfully updated",
            data: userAddress,
          });
        }

        return res.status(200).send({
          success: true,
          message: "Address successfully updated",
          // data: userAddress,
        });
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  deleteAddress: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const deleteAddress = await dbQuery(
          `delete from address where id = ${req.query.addressId}`
        );

        if (deleteAddress.affectedRows) {
          const addressData = await dbQuery(
            `select id, street, province_id, province_label, city_id, city_label, postal_code from address where id_user = ${req.dataUser.id}`
          );
          return res.status(200).send({
            success: true,
            message: "Address deleted",
            data: [...addressData],
          });
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },

  getUserCart: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const cartData = await dbQuery(
          `select c.id, p.name, p.image, p.selling_price, s.unit, c.id_prescription, c.quantity, c.subtotal, s.quantity as current_stock, s.id as id_stock from cart c JOIN stock s ON c.id_stock = s.id JOIN products p ON p.id = s.id_product where c.id_user = ${req.dataUser.id}`
        );
        console.log("cartData", cartData);
        if (cartData.length) {
          return res.status(200).send({
            success: true,
            message: "Cart data fetched successfully",
            data: cartData,
          });
        } else if (cartData.length === 0) {
          return res.status(200).send({
            success: true,
            message: "Cart is empty",
          });
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  addProductToCart: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const userId = req.dataUser.id;
        const { id_stock, quantity, price } = req.body;
        let subtotal = quantity * price;

        const userCartData = await dbQuery(
          `select quantity, subtotal from cart where id_user=${userId} and id_stock=${id_stock}`
        );

        if (userCartData.length) {
          const newQuantity = userCartData[0].quantity + quantity;
          const newSubtotal = userCartData[0].subtotal + subtotal;
          const updateCart = await dbQuery(
            `Update cart set quantity='${newQuantity}', subtotal='${newSubtotal}' where id_user=${userId} and id_stock=${id_stock}`
          );

          const newCartData = await dbQuery(
            `select c.id, p.name, p.image, p.selling_price, s.unit, c.id_prescription, c.quantity, c.subtotal, s.quantity as current_stock from cart c JOIN stock s ON c.id_stock = s.id JOIN products p ON p.id = s.id_product where c.id_user = ${userId}`
          );

          return res.status(200).send({
            success: true,
            message: "Cart successfully updated",
            data: newCartData,
          });
        } else {
          const addToCart = await dbQuery(
            `insert into cart (id_user, id_stock, quantity, subtotal) values ('${userId}','${id_stock}', '${quantity}','${subtotal}')`
          );

          if (addToCart.insertId) {
            const newCartData = await dbQuery(
              `select c.id, p.name, p.image, p.selling_price, s.unit, c.id_prescription, c.quantity, c.subtotal, s.quantity as current_stock, s.id as id_stock from cart c JOIN stock s ON c.id_stock = s.id JOIN products p ON p.id = s.id_product where c.id_user = ${userId}`
            );
            return res.status(200).send({
              success: true,
              message: "Cart successfully updated",
              data: newCartData,
            });
          }
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  editProductInCart: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const { cartId, selling_price, newQuantity } = req.body;
        const userId = req.dataUser.id;
        let newSubtotal = selling_price * newQuantity;

        const updateCart = await dbQuery(
          `Update cart set quantity='${newQuantity}', subtotal='${newSubtotal}' where id=${cartId} and id_user=${userId}`
        );

        if (updateCart.affectedRows) {
          const newCartData = await dbQuery(
            `select c.id, p.name, p.image, p.selling_price, s.unit, c.id_prescription, c.quantity, c.subtotal, s.quantity as current_stock, s.id as id_stock from cart c JOIN stock s ON c.id_stock = s.id JOIN products p ON p.id = s.id_product where c.id_user = ${userId}`
          );
          return res.status(200).send({
            success: true,
            message: "Cart successfully updated",
            data: newCartData,
          });
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
    } catch (error) {
      return next(error);
    }
  },
  deleteProductInCart: async (req, res, next) => {
    try {
      if (req.dataUser.id) {
        const { cart_id } = req.params;

        const userId = req.dataUser.id;

        const deleteItem = await dbQuery(
          `delete from cart where id = ${cart_id}`
        );

        if (deleteItem.affectedRows) {
          const newCartData = await dbQuery(
            `select c.id, p.name, p.image, p.selling_price, s.unit, c.id_prescription, c.quantity, c.subtotal, s.quantity as current_stock from cart c JOIN stock s ON c.id_stock = s.id JOIN products p ON p.id = s.id_product where c.id_user = ${userId}`
          );
          return res.status(200).send({
            success: true,
            message: "Item in cart successfully deleted",
            data: newCartData,
          });
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
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
      if (req.dataUser.id) {
        const idUser = req.dataUser.id;
        const {
          productList,
          selectedAddress,
          shippingMethod,
          totalProductPrice,
          shippingPrice,
          status,
        } = req.body;

        const invoiceNumber =
          "LS-" + crypto.randomBytes(10).toString("hex").toUpperCase();

        const address = `${selectedAddress.street}, ${selectedAddress.city_label}, ${selectedAddress.province_label}, ${selectedAddress.postal_code}`;

        const shipment = `${shippingMethod.courier}-${shippingMethod.service.service}`;

        // add to order list
        const addOrderList = await dbQuery(
          `insert into order_list (id_user, status, shipping_address, shipping_method, invoice_number, subtotal, shipping_cost) value ('${idUser}','${status}','${address}', '${shipment}', '${invoiceNumber}', '${totalProductPrice}', '${shippingPrice}')`
        );

        // add cart data to order content with id from order list
        if (addOrderList.insertId) {
          let cartIds = ""; // to delete cart
          let insertOrderContentQuery = "";

          productList.forEach((value, index) => {
            cartIds += `${value.id}`;
            insertOrderContentQuery += `(${addOrderList.insertId}, ${value.id_stock}, ${value.quantity}, ${value.selling_price})`;
            if (index < productList.length - 1) {
              cartIds += ", ";
              insertOrderContentQuery += ", ";
            }
          });

          const addOrderContent = await dbQuery(
            `insert into order_content (id_order, id_stock, quantity, selling_price) values ${insertOrderContentQuery}`
          );
          console.log("addOrderContent", addOrderContent);
          
          // delete cart data where id in productlist
          const deleteCart = await dbQuery(
            `delete from cart WHERE id IN (${cartIds})`
          );
          if (deleteCart.affectedRows) {
            const orderList = await dbQuery(
              `select ol.id, ol.status, ol.invoice_number, ol.shipping_address, ol.shipping_method, ol.subtotal, ol.shipping_cost, p.name, p.image, s.unit, oc.quantity, oc.selling_price from order_list ol JOIN order_content oc ON oc.id_order = ol.id JOIN stock s ON s.id = oc.id_stock JOIN products p ON p.id = s.id_product WHERE ol.id_user=${idUser}`
            );
            const newCartData = await dbQuery(
              `select c.id, p.name, p.image, p.selling_price, s.unit, c.id_prescription, c.quantity, c.subtotal, s.quantity as current_stock from cart c JOIN stock s ON c.id_stock = s.id JOIN products p ON p.id = s.id_product WHERE c.id_user = ${idUser}`
            );
            return res.status(200).send({
              success: true,
              message: "Checkout success",
              data: { orderList, newCartData },
            });
          }
        }
      } else {
        return res.status(200).send({
          success: false,
          message: "Please login to continue",
        });
      }
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
