const collection = require('../config/collection')
var bcrypt=require('bcrypt')
var db=require('../config/connection')
const { resolve, reject } = require('promise')
const e = require('express')
var objectId=require('mongodb').ObjectID
const { response } = require('express')
module.exports={
    getUserdata:(user)=>{
        return new Promise(async(resolve,reject)=>{
            user.Password=await bcrypt.hash(user.Password,10)
        db.get().collection('userDetails').insertOne(user).then((data)=>{
            resolve(data.ops[o])
        })

        })
        
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
           let user=await db.get().collection('userDetails').findOne({Email:userData.Email})
           if(user){
               bcrypt.compare(userData.Password,user.Password).then((status)=>{
                   if(status){
                       response.user=user
                       response.status=true
                       resolve(response)
                   console.log("Logged")
                }
                   else{
                       resolve({status:false})
                       console.log("No user")
                   }
               })
           }
           else{
               console.log("not Logged")
               resolve({status:false})
           }
        })
    },
    getProductToCart:(userId)=>{
        return new Promise(async(resolve,reject)=>{
          let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quandity:'$products.quandity'
                    }
                },{
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'products'
                    }
                }
            ]).toArray()
            console.log(cartItems[0].products)
            resolve(cartItems)
            
        })
       
    },
    getcount:(userID)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userID)})
            if(cart){
                count=cart.products.length

            }
            resolve(count)
        })
    },
    removeCart:(cartId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({},
                {
                    $pull:{
                        products:{item:objectId(cartId)}
                    }
                }).then(()=>{
                    resolve()
                })
        })
    },
    
    increment:(itemId,userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),"products.item":objectId(itemId)},{$inc:{
                "products.$.quandity":1
            }}).then(()=>{
                resolve()
            })
        })
    },
    decrement:(itemId,userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),"products.item":objectId(itemId)},{$inc:{
                "products.$.quandity":-1
            }}).then(()=>{
                resolve()
            })
        })

    },
   order:(userId)=>{
    return new Promise(async(resolve,reject)=>{
        let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
              {
                  $match:{user:objectId(userId)}
              },
              {
                  $unwind:'$products'
              },
              {
                  $project:{
                      item:'$products.item',
                      quandity:'$products.quandity'
                  }
              },{
                  $lookup:{
                      from:collection.PRODUCT_COLLECTION,
                      localField:'item',
                      foreignField:'_id',
                      as:'products'
                  }
              },{
                  $project:{
                      item:1,quandity:1,products:{$arrayElemAt:['$products',0]}
                  }
              },
              {
                  $group:{

                      _id:null,
                      total:{$sum:{$multiply:['$quandity','$products.Price']}}

                  }
              }
          ]).toArray()
          console.log(total)
          resolve(total[0].total)
          
      })
    

   },
   orderchart:(order,total,cart)=>{
       return new Promise((resolve,reject)=>{
           let status=order.payment==='cod'?'placed':'pending';
           let orderObj={
            delivery:{
                name:order.Name,
                address:order.Address,
                phone:order.Phone,
                date:new Date()
            },
            userId:objectId(order.userId),
            paymentMethod:order.payment,
            status:status,
            products:cart,
            total:total
           }
           db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
               db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})
               resolve()
           })
       })
   },
   getcartdetails:(user)=>{
       return new Promise((resolve,reject)=>{
           db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(user)}).then((response)=>{
               console.log(response);
               resolve(response.products)
           })
       })
   },
   viewOrder:(userId)=>{
       return new Promise(async(resolve,reject)=>{
           let order=await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
        //    console.log("New order is ",order[0]);
           resolve(order)

       })
   },
   getOrderPdts:(orderId)=>{
       return new Promise(async(resolve,reject)=>{
        let cartItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{_id:objectId(orderId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quandity:'$products.quandity'
                }
            },{
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'products'
                }
            }
        ]).toArray()
        console.log(cartItems[0].products)
        resolve(cartItems)

       })
   }
            
}


// let area ,//cartile field, $in//prolist ids are match with product ids in products
// db.cart.update({user:ObjectId("60abcf51c208c229ee8711e0"),"products.item":ObjectId("60a3659c96635c1c4772debd")},{$inc:{"products.$.quandity":1}})