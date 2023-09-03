const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = './my_database.db'; // Update with your database file path

class Product {
  constructor(id, name, image_url, price, category) {
    this.id = id; // Assign the id value
    this.name = name;
    this.image_url = image_url;
    this.price = price;
    this.category = category;
  }
}

class Store {
  constructor(id, name, image_url, productList) {
    this.id = id; // Assign the id value
    this.name = name;
    this.image_url = image_url;
    this.productList = productList;
  }
}

const productList = [
  new Product(1, 'Nigka Prowler edition. Pride month celebrate.', 'https://drive.google.com/uc?export=view&id=1DQr-M8L3dCyxVOLxwSPJKqGMNbD2Oj0B', 35000, 'sport'),
  new Product(2, 'Nigka Air Jordan 1 KO Chicago limited edition.', 'https://drive.google.com/uc?export=view&id=1WfJPwsaPmEbUpYuj43uApU-qumtsvqux', 25000, 'sport'),
  new Product(3, 'Nigka Magista onda SG.', 'https://drive.google.com/uc?export=view&id=1vjaZkYtNcp4MFLDhruzsN7FHh843OgjQ', 5990, 'sport'),
  new Product(4, 'Nigka Big Ball Chunky A.', 'https://drive.google.com/uc?export=view&id=16YZu5RmoxOU9duPqJ9cH5hLXqoS_XZMo', 3590, 'sport'),
  new Product(5, 'Nigka MASSIVE PLATFORM HOLOGRAPHIC.', 'https://drive.google.com/uc?export=view&id=1J2Pgf4FOR7ZblAXf4dYwbQIHagRqtEBg', 2990, 'sport'),
  new Product(6, 'GUCCI Bomber Jacket.', 'https://drive.google.com/uc?export=view&id=1mDOIZu55dTr4RX7lu7-d3NAJEygEJ4hb', 92277, 'fashion'),
  new Product(7, 'Casio Edifice Chronograph.', 'https://drive.google.com/uc?export=view&id=1SVZHvVjwfEu7yJkqZnXBrwaGlw95Ze_F', 2590, 'fashion'),
  new Product(8, 'electric patient bed.', 'https://drive.google.com/uc?export=view&id=1bCMpv3iIy52jjdx1AdTw2cEAN8PkOc9p', 36900, 'furniture'),
  new Product(9, 'Extreme King Honor Gaming Chair.', 'https://drive.google.com/uc?export=view&id=1G5ouV0EujngxQYUDcQQ3BN-MiSc4kQ0r', 4490, 'furniture'),
];

const store1 = [productList[0], productList[1], productList[2], productList[3]];
const store2 = [productList[4], productList[5]];
const store3 = [productList[6], productList[7]];

const storeProducts = [[1,1],[1,2],[1,3],[1,4],[2,5],[2,6],[3,7],[3,8]]

const storeList = [
  new Store(1, 'Nigka Shop', 'https://drive.google.com/uc?export=view&id=1P6YhGcCxNru10Cn8hnTh_k5d5CYX3Ztx', store1),
  new Store(2, 'Siam watch', 'https://drive.google.com/uc?export=view&id=1H3hfH-XBFKk7FpGvBLNyynA7Wl3Dkxch', store2),
  new Store(3, 'Michi furniture', 'https://drive.google.com/uc?export=view&id=1NXA50vj9zHa6f1o-oAd4e5RBRfAIdtKk', store3),
];



async function initializeDatabase() {
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS Product (
      id INTEGER PRIMARY KEY,
      name TEXT,
      image_url TEXT,
      price INTEGER,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE, -- Use UNIQUE constraint to ensure usernames are unique
      password_hash TEXT -- Store the hashed password
    );

    CREATE TABLE IF NOT EXISTS UserCart (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      product_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES User(id),
      FOREIGN KEY(product_id) REFERENCES Product(id)
    );

    CREATE TABLE IF NOT EXISTS Store (
      id INTEGER PRIMARY KEY,
      name TEXT,
      image_url TEXT
    );
  
    CREATE TABLE IF NOT EXISTS StoreProduct (
      id INTEGER PRIMARY KEY,
      store_id INTEGER,
      product_id INTEGER,
      FOREIGN KEY(store_id) REFERENCES Store(id),
      FOREIGN KEY(product_id) REFERENCES Product(id)
    );
  `);

  // Check if initial data has already been inserted
  const existingProducts = await db.get('SELECT COUNT(*) as count FROM Product');

  if (existingProducts.count === 0) {
    const initialProducts = productList;

    for (const product of initialProducts) {
      await db.run('INSERT INTO Product (id, name, image_url, price, category) VALUES (?, ?, ?, ?, ?)',
        [product.id, product.name, product.image_url, product.price, product.category]);
    }

    // ... more initialization code ...
  }
  async function insertStoreProducts(db, storeId, productList) {
    for (const product of productList) {
      await db.run('INSERT INTO StoreProduct (store_id, product_id) VALUES (?, ?)',
        [storeId, product.id]);
    }
  }
  
  const existingStore = await db.get('SELECT COUNT(*) as count FROM Store');
  if (existingStore.count === 0) {
    const initialStores = storeList;
  
    for (const store of initialStores) {
      await db.run('INSERT INTO Store (id, name, image_url) VALUES (?, ?, ?)',
        [store.id, store.name, store.image_url]);
  
      await insertStoreProducts(db, store.id, store.productList);
    }
  
    // ... more initialization code ...
  }

  return db;
}


const dbPromise = initializeDatabase();

app.get('/api/products', async (req, res) => {
  const db = await dbPromise;
  const products = await db.all('SELECT * FROM Product');
  res.json(products);
});

app.get('/api/stores', async (req, res) => {
  try {
    const db = await dbPromise;
    const stores = await db.all('SELECT * FROM Store');

    const storesWithProducts = await Promise.all(
      stores.map(async (store) => {
        const products = await db.all('SELECT * FROM Product WHERE id IN (SELECT product_id FROM StoreProduct WHERE store_id = ?)', [store.id]);
        return { ...store, productList: products };
      })
    );

    res.json(storesWithProducts);
  } catch (error) {
    console.error('Error retrieving stores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users', async (req, res) => {
  const db = await dbPromise;
  const users = await db.all('SELECT * FROM User');
  res.json(users);
});

app.get('/api/userCart', async (req, res) => {
  const db = await dbPromise;
  const cart = await db.all('SELECT * FROM UserCart');
  res.json(cart);
});

app.post('/api/addProduct', async (req, res) => {
  const db = await dbPromise;
  const product = await db.run('INSERT INTO Product (id, name, image_url, price, category) VALUES (?, ?, ?, ?, ?)',
        [23, 'new product 02','https://drive.google.com/uc?export=view&id=1G5ouV0EujngxQYUDcQQ3BN-MiSc4kQ0r' , 12000, 'sport']);
  res.json('Product added')
});

app.post('/api/addProduct03', async (req, res) => {
  const db = await dbPromise;
  const product = await db.run('INSERT INTO Product (id, name, image_url, price, category) VALUES (?, ?, ?, ?, ?)',
        [24, 'new product 03','https://drive.google.com/uc?export=view&id=1G5ouV0EujngxQYUDcQQ3BN-MiSc4kQ0r' , 1222000, 'furniture']);
  res.json('Product added')
});

app.delete('/api/deleteProduct', async (req, res) => {
  const db = await dbPromise;
  const product = await db.run('DELETE FROM Product WHERE id = ?', [18]);
  res.json('Success');
});


app.post('/api/cart/add', async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ error: 'Missing userId or productId' });
  }

  try {
    const db = await dbPromise;

    // Check if the user and product exist
    const user = await db.get('SELECT * FROM User WHERE id = ?', [userId]);
    const product = await db.get('SELECT * FROM Product WHERE id = ?', [productId]);

    if (!user || !product) {
      return res.status(404).json({ error: 'User or product not found' });
    }

    // Insert the product into the user's cart
    await db.run('INSERT INTO UserCart (user_id, product_id) VALUES (?, ?)', [userId, productId]);

    res.json({ message: 'Product added to cart' });
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const db = await dbPromise;
    const existingUser = await db.get('SELECT * FROM User WHERE username = ?', [username]);

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Insert the user without hashing the password
    await db.run('INSERT INTO User (username, password_hash) VALUES (?, ?)', [username, password]);

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM User WHERE username = ?', [username]);

    console.log('User password:', user.password_hash);
    console.log('Received password:', password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid User' });
    }

    // Compare plain text password with stored plain text password
    if (password !== user.password_hash) {
      return res.status(401).json({ error: 'Wrong Password', user,password});
    }

    // Generate and return an authentication token (JWT)
    const token = generateAuthToken(user.id); // You need to implement this function
    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/removeFromCart', async (req, res) => {
  const { user_id, product_id } = req.body;

  if (!user_id || !product_id) {
    return res.status(400).json({ error: 'Missing user_id or product_id' });
  }

  try {
    const db = await dbPromise;
    
    // Find the first product in the user's cart matching the product_id
    const cartItem = await db.get('SELECT * FROM UserCart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    
    if (!cartItem) {
      return res.status(404).json({ error: 'Product not found in cart' });
    }

    // Remove the product from the user's cart
    await db.run('DELETE FROM UserCart WHERE id = ?', [cartItem.id]);

    res.json({ message: 'Product removed from cart' });
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/changePassword', async (req, res) => {
  const { userId, oldPassword, newPassword, confirmNewPassword } = req.body;

  if (!userId || !oldPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'New passwords do not match' });
  }

  try {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM User WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user's password in the database
    await db.run('UPDATE User SET password_hash = ? WHERE id = ?', [newPassword, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Secret key for JWT
const JWT_SECRET = 'orange-key'; // Replace with a secure secret

// Function to generate JWT token
function generateAuthToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}