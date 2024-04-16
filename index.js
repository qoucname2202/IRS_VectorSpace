import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { Corpus } from './utils';
import { ArticlesModel } from './model/articles.model';
import 'dotenv/config';
import moment from 'moment-timezone';

const app = express();
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());

const url = process.env.DB_URL;
const port = process.env.PORT;
const host = process.env.HOST;
const dbNews = process.env.DB_NAME_VNEXPRESS;

app.use(compression());
app.use(cors());
app.use(morgan('dev'));
app.disable('x-powered-by');
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.static('.'));
// Get the current date and time in UTC
const nowUtc = moment.utc();
// Format the date and time in the specified format: 'dd/mm/yyyyTHH:mm:ss'
const formattedDateTime = nowUtc.format('DD/MM/YYYYTHH:mm:ss');

// Connect mongodb
mongoose
	.connect(`${url}${dbNews}`)
	.then(() => console.log('MongoDB connected...'))
	.catch(err => console.error('MongoDB connection error:', err));

const getArticlesDetails = async articleIdPairs => {
	try {
		const articleIds = articleIdPairs.map(pair => pair[0]);
		const articles = await ArticlesModel.find({
			_id: { $in: articleIds },
		});
		return articles;
	} catch (error) {
		console.error('Error fetching articles:', error);
		throw error;
	}
};
// Searching endpoint
app.post('/search', async (req, res) => {
	try {
		const { keyword } = req.body;
		const articles = await ArticlesModel.find();
		const documents = [];
		const texts = [];
		articles.forEach(item => {
			documents.push(item._id.toString());
			texts.push(item.content);
		});
		const corpus = new Corpus(documents, texts);
		const articleIdPairs = corpus.getResultsForQuery(keyword);
		const articleRecommend = await getArticlesDetails(articleIdPairs);
		res.status(200).json({
			statusCode: 200,
			message: 'Get all news successfully!',
			data: articleRecommend,
			dateTime: formattedDateTime,
		});
	} catch (error) {
		res.status(500).send(error);
	}
});

// Create server
app.listen(port, host, () => {
	console.log(`🚀 Server Running On Port ${port}`);
});
