import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId, // Special type for MongoDB's unique IDs
	categoryId: mongoose.Schema.Types.ObjectId, // Assuming this relates to another collection for categories
	title: String,
	author: String,
	content: String,
	link: String,
	posted_at: Date, // Using JavaScript's Date object to store dates
});
export const ArticlesModel = mongoose.model('articles', articleSchema);
