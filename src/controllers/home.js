const { Router } = require("express");
const { isUser, isOwner, hasVoted } = require("../middlewares/guards");
const { body, validationResult } = require("express-validator");
const { parseError } = require("../util");
const { create, getAll, getById, update, deleteById, getLastThree, recommend } = require("../services/data");
const { Data } = require("../models/Data");

//TODO replace with real router according to exam description
const homeRouter = Router();

homeRouter.get('/', async (req, res) => {
    //This code creates a token and saves it in a cookie
    //const result = await login('John', '123456');
    //const token = createToken(result);
    //res.cookie('token', token)

    const lastThree = await getLastThree();


    res.render('home', { title: 'Home', lastThree });
});

homeRouter.get('/create', isUser(), (req, res) => {
    res.render('create', { title: 'Create' });
});
homeRouter.post('/create', isUser(),
    body('name').trim().isLength({ min: 2 }).withMessage('The Name should be atleast 2 characters'),
    body('skin').trim().isLength({ min: 10, max: 100 }).withMessage('The Skin should be between 10 and 100 characters'),
    body('description').trim().isLength({ min: 20, max: 200 }).withMessage('The Description should be between 20 and 200 characters long'),
    body('ingredients').trim().isLength({ min: 2, max: 50 }).withMessage('The Ingredients should be between 2 and 50 characters long'),
    body('benefits').trim().isLength({ min: 10, max: 100 }).withMessage('The Benefits should be between 10 and 100 characters long'),
    body('price').trim().notEmpty().withMessage('Elevation is required').bail().isFloat({ min: 0.01 }).withMessage('Price should be a positive number'),
    body('image').trim().isURL({ require_tld: false, require_protocol: true }).withMessage('The Image should start with http:// or https://'),
    async (req, res) => {
        const { name, skin, description, ingredients, benefits, price, image } = req.body;
        try {
            const validation = validationResult(req);
            
            if (!validation.isEmpty()) {
                throw validation.array();
            }

            const authorId = req.user._id;

            const result = await create(req.body, authorId);

            res.redirect('/catalog');
        } catch (err) {
            console.log(err);
            
            res.render('create', { data: { name, skin, description, ingredients, benefits, price, image }, errors: parseError(err).errors })
        }
    });

homeRouter.get('/catalog', async (req, res) => {
    const products = await getAll();
    res.render('catalog', { products, title: 'Catalog' });
});

homeRouter.get('/catalog/:id', async (req, res) => {

    const id = req.params.id;
    const product = await getById(id);
    let recommendCount = product.recommendList.length;

    if (!product) {
        res.render('404', { title: 'Error' });
        return;
    };

    const isLoggedIn = req.user;
    const isAuthor = req.user?._id == product.author.toString();
    const hasRecommended = Boolean(product.recommendList.find(id => id.toString() == req.user?._id));

    res.render('details', { product, recommendCount, isLoggedIn, isAuthor, hasRecommended, title: `Details ${product.name}` });
});


homeRouter.get('/catalog/:id/edit', isOwner(), async (req, res) => {
    try {
        const product = await getById(req.params.id);

        if (!product) {
            res.render('404');
            return;
        };

        res.render('edit', { product, title: `Edit ${product.name}` });
    } catch (err) {
        console.error('Error loading edit form: ', err);
        res.redirect('/404');
    }
});
homeRouter.post('/catalog/:id/edit', isOwner(),
    body('name').trim().isLength({ min: 2 }).withMessage('The Name should be atleast 2 characters'),
    body('skin').trim().isLength({ min: 10, max: 100 }).withMessage('The Skin should be between 10 and 100 characters'),
    body('description').trim().isLength({ min: 20, max: 200 }).withMessage('The Description should be between 20 and 200 characters long'),
    body('ingredients').trim().isLength({ min: 2, max: 50 }).withMessage('The Ingredients should be between 2 and 50 characters long'),
    body('benefits').trim().isLength({ min: 10, max: 100 }).withMessage('The Benefits should be between 10 and 100 characters long'),
    body('price').trim().notEmpty().withMessage('Elevation is required').bail().isFloat({ min: 0.01 }).withMessage('Price should be a positive number'),
    body('image').trim().isURL({ require_tld: false, require_protocol: true }).withMessage('The Image should start with http:// or https://'),
    async (req, res) => {
        const product = await getById(req.params.id);
        try {
            const validation = validationResult(req);

            if (!validation.isEmpty()) {
                throw validation.array();
            }

            if (!product) {
                res.render('404');
                return;
            };
            console.log('before update');
            const newRecord = await update(req.params.id, req.user._id, req.body);
            console.log('áfter update');
            
            res.redirect(`/catalog/${req.params.id}`);
        } catch (err) {
            res.render('edit', { product, errors: parseError(err).errors });
        }
    });

homeRouter.get('/catalog/:id/delete', isOwner(), async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user._id;
        await deleteById(id, userId);
        res.redirect('/catalog');
    } catch (err) {
        console.log(err);

        res.render('404', { title: 'Error' });
    }
});

homeRouter.get('/catalog/:id/recommend', hasVoted(), async (req, res) => {
    try {
        await recommend(req.params.id, req.user._id);
        res.redirect(`/catalog/${req.params.id}`);
    } catch (err) {
        console.log(err);
        res.render('404', { title: 'Error' });
    }
});

homeRouter.get('/search', async (req, res) => {
    const { search = '' } = req.query;
    let products = await getAll();

    if (search) {
        products = products.filter(pr => pr.name.toLowerCase().includes(search.toLowerCase()));
    }

    res.render('search', { products, search, title: 'Search' });
});

module.exports = { homeRouter }