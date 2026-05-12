const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const exercisesRoutes = require('./routes/exercises')
const routinesRoutes = require('./routes/routines')
const workoutsRoutes = require('./routes/workouts')
const wellnessRoutes = require('./routes/wellness')
const metricsRoutes = require('./routes/metrics')
const partnerRoutes = require('./routes/partner')
const statsRoutes = require('./routes/stats')
const exportRoutes = require('./routes/export')
const { router: notificationsRoutes } = require('./routes/notifications')
const publicRoutes = require('./routes/public')
const photosRoutes = require('./routes/photos')

const app = express()

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/exercises', exercisesRoutes)
app.use('/api/routines', routinesRoutes)
app.use('/api/workouts', workoutsRoutes)
app.use('/api/wellness', wellnessRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/partner', partnerRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/photos', photosRoutes)

// Central error handler — must be last middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

module.exports = app
