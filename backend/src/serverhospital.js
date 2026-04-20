import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// 🔍 API ค้นหาโรงพยาบาล
app.get('/api/search-hospitals', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;

    const response = await axios.get(url, {
      params: {
        query: `${query} hospital thailand`,
        key: API_KEY,
        language: 'th',
        region: 'th',
      },
    });

    // ✅ debug ตรงนี้
    console.log(response.data);

    const results = response.data.results || [];

    // ✅ เอาเฉพาะที่เป็น hospital จริง
    const filtered = results.filter(place =>
      place.types &&
      (
        place.types.includes('hospital') ||
        place.types.includes('health')
      )
    );

    const hospitals = filtered.slice(0, 10).map((place) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || '',
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    }));

    res.json(hospitals);
  } catch (error) {
    console.error('Google API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
});