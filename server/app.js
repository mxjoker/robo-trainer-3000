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

const app = express()

app.use(cors())
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

module.exports = app
