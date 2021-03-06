const Product=require('../models/product');
const User=require('../models/user');
const {validationResult}=require('express-validator/check');
const fileHelper=require('../util/file');

const ITEMS_PER_PAGE=2;

exports.getAddProduct=(req,res,next)=>{
    res.render('admin/edit-product',
    {
        pageTitle : 'Add Product' ,
        path : '/admin/add-product',
        editing:false,
        hasError:false,
        errorMessage:null,
        validationErrors:[]
        
    });
};

exports.postAddProduct=(req,res,next)=>{
    console.log(" efds");
    const title=req.body.title;
    const image=req.file;
    const price=req.body.price;
    const description=req.body.description;
    const errors=validationResult(req);
   // console.log(image);
    if(!image){
        return res.status(422).render('admin/edit-product',
        {
            pageTitle : 'Add Product' ,
            path : '/admin/add-product',
            editing:false,
            hasError:true,
            product:{
                title:title,
                price:price,
                description:description
            },
            errorMessage:'Attached File is not an image',
            validationErrors:[]
        });
    }
    if(!errors.isEmpty()){
        return res.status(422).render('admin/edit-product',
        {
            pageTitle : 'Add Product' ,
            path : '/admin/add-product',
            editing:false,
            hasError:true,
            product:{
                title:title,
                price:price,
                description:description
            },
            errorMessage:errors.array()[0].msg,
            validationErrors:errors.array()
        });
    }
    const imageUrl=image.path;
    const product=new Product({
        title : title,
        price : price,
        description : description,
        imageUrl : imageUrl,
        userId:req.user
    });
    product.save()
    .then((result)=>{
        console.log('Created Product');
        res.redirect('/admin/products');
    })
    .catch((err)=>{
        //res.redirect('/500');
        const error=new Error(err);
        error.httpStatusCode=500;
        return next(error);
    });
};

exports.getEditProduct=(req,res,next)=>{
    const editMode=req.query.edit;
    if(!editMode){
        return res.redirect('/');
    }
    const prodId=req.params.productId;
    Product.findById(prodId)
    .then(product=>{
        if(!product){
            return res.redirect('/');
        }
        res.render('admin/edit-product',
        {
            pageTitle : 'Edit Product' ,
            path : '/admin/edit-product',
            editing:editMode,
            product:product,
            hasError:false,
            errorMessage:null,
            validationErrors:[]
        });
   })
   .catch(err=>{
        const error=new Error(err);
        error.httpStatusCode=500;
        return next(error);
    });
};

exports.postEditProduct = (req,res,next)=>{
    const prodId=req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice=req.body.price;
    const image=req.file;
    const updatedDesc=req.body.description;
   
    const errors=validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.render('admin/edit-product',
        {
            pageTitle : 'Edit Product' ,
            path : '/admin/edit-product',
            editing:true,
            hasError:true,
            product:{
                _id:prodId,
                title:updatedTitle,
                price:updatedPrice,
                description:updatedDesc
            },
            errorMessage:errors.array()[0].msg,
            validationErrors:errors.array()
        });
    }

    Product.findById(prodId)
    .then((product)=>{
        if(product.userId.toString()!==req.user._id.toString()){
            return res.redirect('/');
        }
        
        product.title=updatedTitle;
        product.price=updatedPrice;
        
        if(image){
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl=image.path;
        }
        product.description=updatedDesc;
        console.log(product);
        return product.save()
        .then(result=>
        {
            console.log('Updated Product.')
            res.redirect('/admin/products');
        });
    })
    .catch(err=>{
        const error=new Error(err);
        error.httpStatusCode=500;
        return next(error);
    });
}

exports.postdeleteProduct=(req,res,next)=>{
    const prodId=req.body.productId;
    Product.findById(prodId)
    .then(product=>{
        if(!product){
            return next(new Error('Product not Found'));
        }
        fileHelper.deleteFile(product.imageUrl);
        return  Product.deleteOne({_id:prodId,userId:req.user._id});
    })
    .then(()=>{
        console.log('Deleted Product');
        req.user.removeFromCart(prodId);
        res.redirect('/admin/products');
    })
    .catch(err=>{
        const error=new Error(err);
        error.httpStatusCode=500;
        return next(error);
    });
};



exports.getProducts=(req,res,next)=>{
    //req.user.getProducts()
    const page=+req.query.page || 1 ;
    let totalItems;

    Product.find({userId:req.user._id})
    .countDocuments()
    .then(numProducts=>{
        totalItems=numProducts;
        return Product.find({userId:req.user._id})
        .skip((page-1)*ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then((products)=>{
        console.log(products);
        res.render('admin/products',
        {
            prods : products,
            pageTitle : 'Admin Products',
            path : '/admin/products',
            currentPage:page,
            hasNextPage: ITEMS_PER_PAGE*page < totalItems,
            hasPreviousPage:page>1,
            nextPage:page+1,
            previousPage:page-1,
            lastPage:Math.ceil(totalItems/ITEMS_PER_PAGE)
        });
    })
    .catch(err=>{
        const error=new Error(err);
        error.httpStatusCode=500;
        return next(error);
    });
}

