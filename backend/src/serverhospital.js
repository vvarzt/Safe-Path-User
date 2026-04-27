import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

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

    if (!API_KEY) {
      console.error('[ERROR] GOOGLE_PLACES_API_KEY is not set in .env');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await axios.get(url, {
      params: {
        query: `${query} hospital thailand`,
        key: API_KEY,
        language: 'th',
        region: 'th',
      },
      timeout: 8000, // 8 วินาที timeout
    });

    console.log('[GOOGLE_API_RESPONSE]', response.data.results?.length || 0, 'results');

    const results = response.data.results || [];

    // ✅ เอาเฉพาะที่เป็น hospital จริง
    const filtered = results.filter(place =>
      place.types &&
      (
        place.types.includes('hospital') ||
        place.types.includes('health') ||
        place.types.includes('doctor') ||
        place.types.includes('pharmacy')
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
    console.error('[GOOGLE_API_ERROR]', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(500).json({ error: 'Failed to fetch hospitals from Google Places API' });
  }
});
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
});