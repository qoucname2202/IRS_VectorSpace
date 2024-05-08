import path from 'path';
import fs from 'fs/promises';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

const url = process.env.DB_URL;
const dbName = process.env.DB_NAME_THESIS;
const client = new MongoClient(url);

async function readCitiesAndSaveToMongoDB(directoryPath) {
	await client.connect();
	console.log('Connected successfully to MongoDB server');
	const db = client.db(dbName);

	// Create collections
	const citiesCollection = db.collection('cities');
	const hotelsCollection = db.collection('hotels');

	const cityCache = {};

	async function getCityId(cityName) {
		if (cityCache[cityName]) {
			return cityCache[cityName];
		}
		const cityDoc = await citiesCollection.findOneAndUpdate(
			{ name: cityName },
			{ $setOnInsert: { name: cityName } },
			{ upsert: true, returnDocument: 'after' },
		);
		const cityId = cityDoc._id; // Use the value property
		cityCache[cityName] = cityId;
		return cityId;
	}

	const cities = await fs.readdir(directoryPath, { withFileTypes: true });
	for (const dirent of cities.filter(dirent => dirent.isDirectory())) {
		const cityName = dirent.name;
		const cityPath = path.join(directoryPath, cityName);
		const cityId = await getCityId(cityName);
		const hotelFiles = await fs.readdir(cityPath);

		for (const file of hotelFiles) {
			const filePath = path.join(cityPath, file);
			const hotelData = JSON.parse(await fs.readFile(filePath, 'utf8'));
			hotelData.city_id = cityId; // Add the city_id to the hotel data

			// Insert the hotel data into the hotels collection
			await hotelsCollection.updateOne(
				{ name: hotelData.name, city_id: cityId },
				{ $set: hotelData },
				{ upsert: true },
			);
		}
	}
	console.log(
		'All city and hotel files have been processed and saved to MongoDB.',
	);
}

const directoryPath = './data/test'; // Replace with your actual directory path
readCitiesAndSaveToMongoDB(directoryPath)
	.then(() => console.log('City and Hotel save completed.'))
	.catch(console.error)
	.finally(() => client.close());
