require('dotenv').config();

const path = require('path');
const express = require('express');

const usersRouter = require('./routes/users');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

app.use('/', usersRouter);

app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Pagina no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).render('errors/500', { title: 'Error del servidor', detalle: err.message });
});

app.listen(PORT, () => {
  console.log(`Job ITM escuchando en http://localhost:${PORT}`);
});
