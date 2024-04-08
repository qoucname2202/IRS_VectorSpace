import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId, // Special type for MongoDB's unique IDs
	name: String,
});

export const CategoryModel = mongoose.model('categories', categorySchema);
