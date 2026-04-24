require('dotenv').config()
const app = require('./app')
const { startScheduler } = require('./push/scheduler')

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startScheduler()
})
