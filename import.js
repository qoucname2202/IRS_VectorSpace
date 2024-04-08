import path from 'path';
import moment from 'moment-timezone';
import fs from 'fs/promises';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

const url = process.env.DB_URL;
const dbName = process.env.DB_NAME;
const client = new MongoClient(url);

async function readFilesAndSaveToMongoDB(directoryPath) {
	await client.connect();
	console.log('Connected successfully to MongoDB server');
	const db = client.db(dbName);

	// Create collection
	const articlesCollection = db.collection('articles');
	const categoriesCollection = db.collection('categories');

	const categoryCache = {};

	async function getCategoryId(categoryName) {
		if (categoryCache[categoryName]) {
			return categoryCache[categoryName];
		}
		const categoryDoc = await categoriesCollection.findOneAndUpdate(
			{ name: categoryName },
			{ $setOnInsert: { name: categoryName } },
			{ upsert: true, returnDocument: 'after' },
		);
		const categoryId = categoryDoc._id;
		categoryCache[categoryName] = categoryId;
		return categoryId;
	}

	const categories = await fs.readdir(directoryPath, { withFileTypes: true });
	for (const dirent of categories.filter(dirent => dirent.isDirectory())) {
		const categoryName = dirent.name;
		const categoryPath = path.join(directoryPath, categoryName);
		const categoryId = await getCategoryId(categoryName);
		const files = await fs.readdir(categoryPath);

		// Prepare bulk operation array
		const bulkOps = [];
		for (const file of files) {
			const filePath = path.join(categoryPath, file);
			const content = await fs.readFile(filePath, 'utf8');
			// Extract the article parts
			const [title, link, author, posted_at, ...articleContentParts] = content
				.split('\n')
				.map(line => line.trim())
				.filter(line => line);
			const articleContent = articleContentParts.join('\n'); // Join the remaining parts for the content
			// Parse the date and time into a moment object with the timezone set to GMT+7
			const momentObj = moment.tz(
				posted_at,
				'dddd, D/M/YYYY, HH:mm (GMTZ)',
				'vi',
				'Asia/Ho_Chi_Minh',
			);
			// Convert the moment object to UTC
			const momentUTC = momentObj.utc();
			bulkOps.push({
				updateOne: {
					filter: { title, categoryId },
					update: {
						$set: {
							title,
							link,
							author,
							posted_at: momentUTC.format('YYYY-MM-DD HH:mm:ss'),
							content: articleContent,
						},
					},
					upsert: true,
				},
			});
		}
		// Perform bulk write operation
		if (bulkOps.length) {
			await articlesCollection.bulkWrite(bulkOps, { ordered: false });
		}
	}
	console.log('All files have been processed and saved to MongoDB.');
}
const directoryPath = './data';
readFilesAndSaveToMongoDB(directoryPath)
	.then(() => console.log('Save completed.'))
	.catch(console.error)
	.finally(() => client.close());
