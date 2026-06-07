import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

const DB_FILE = path.join(process.cwd(), "db.json");
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");

interface DatabaseSchema {
  users: any[];
  students: any[];
  payments: any[];
  terms?: any[];
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Failed to load local DB file, using fallback:", error);
  }
  return { users: [], students: [], payments: [], terms: [] };
}

function saveDatabase(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist local DB file:", error);
  }
}

// Initialize Firebase server-side if configuration exists
let firestoreDb: any = null;
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    if (firebaseConfig && firebaseConfig.projectId) {
      console.log("Initializing server-side Cloud Firestore for project:", firebaseConfig.projectId);
      const firebaseApp = initializeApp(firebaseConfig);
      const dbId = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === 'default') 
        ? undefined 
        : firebaseConfig.firestoreDatabaseId;
      firestoreDb = getFirestore(firebaseApp, dbId);
    }
  } catch (err) {
    console.error("Firebase server-side init error: ", err);
  }
}

// Automatically seed Cloud Firestore on server boot if Firestore is empty
async function bootstrapCloudSeeding() {
  if (!firestoreDb) return;
  try {
    console.log("Checking Cloud Firestore seed status...");
    const qSnapshot = await getDocs(collection(firestoreDb, "users"));
    if (qSnapshot.empty) {
      console.log("Cloud Firestore is empty. Seeding Firestore with local db.json database...");
      const local = loadDatabase();
      const timestamp = new Date().toISOString();

      // Seed Users
      if (local.users && local.users.length > 0) {
        for (let i = 0; i < local.users.length; i += 400) {
          const chunk = local.users.slice(i, i + 400);
          const batch = writeBatch(firestoreDb);
          chunk.forEach(item => {
            if (item && item.id) {
              batch.set(doc(firestoreDb, "users", item.id), item);
            }
          });
          await batch.commit();
        }
      }

      // Seed Students
      if (local.students && local.students.length > 0) {
        for (let i = 0; i < local.students.length; i += 400) {
          const chunk = local.students.slice(i, i + 400);
          const batch = writeBatch(firestoreDb);
          chunk.forEach(item => {
            if (item && item.id) {
              batch.set(doc(firestoreDb, "students", item.id), item);
            }
          });
          await batch.commit();
        }
      }

      // Seed Payments
      if (local.payments && local.payments.length > 0) {
        for (let i = 0; i < local.payments.length; i += 400) {
          const chunk = local.payments.slice(i, i + 400);
          const batch = writeBatch(firestoreDb);
          chunk.forEach(item => {
            if (item && item.id) {
              batch.set(doc(firestoreDb, "payments", item.id), item);
            }
          });
          await batch.commit();
        }
      }

      // Seed Terms
      let termsToSeed = local.terms || [];
      if (termsToSeed.length === 0) {
        const defaultTerms = [{
          id: 'term_default',
          name: 'Term 1 (May/June 2026)',
          startDate: '2026-05-25',
          daysCount: 15,
          schoolDays: [
            "2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29",
            "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05",
            "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"
          ],
          active: true
        }];
        termsToSeed = defaultTerms;
        local.terms = defaultTerms;
        saveDatabase(local);
      }
      if (termsToSeed.length > 0) {
        for (let i = 0; i < termsToSeed.length; i += 400) {
          const chunk = termsToSeed.slice(i, i + 400);
          const batch = writeBatch(firestoreDb);
          chunk.forEach(item => {
            if (item && item.id) {
              batch.set(doc(firestoreDb, "terms", item.id), item);
            }
          });
          await batch.commit();
        }
      }

      console.log("Automatic server-side Cloud Firestore seeding completed successfully!");
    } else {
      console.log("Cloud Firestore contains live records. Standard bootstrap seeding bypassed.");
    }
  } catch (err) {
    console.error("Error during automatic server bootstrap seeding:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware with custom limits for batch transactions
  app.use(express.json({ limit: "50mb" }));

  // Run the seeding bootstrap check
  bootstrapCloudSeeding();

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // GET /api/users
  app.get("/api/users", async (req, res) => {
    if (firestoreDb) {
      try {
        const qSnaps = await getDocs(collection(firestoreDb, "users"));
        const list = qSnaps.docs.map(d => d.data());
        // Sync local cache
        const dbLocal = loadDatabase();
        dbLocal.users = list;
        saveDatabase(dbLocal);
        return res.json(list);
      } catch (e) {
        console.error("Firestore getUsers failed, falling back to local SQLite/JSON:", e);
      }
    }
    const db = loadDatabase();
    res.json(db.users || []);
  });

  // POST /api/users
  app.post("/api/users", async (req, res) => {
    const user = req.body;
    
    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (!dbLocal.users) dbLocal.users = [];
    const idx = dbLocal.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      dbLocal.users[idx] = user;
    } else {
      dbLocal.users.push(user);
    }
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "users", user.id), user);
      } catch (e) {
        console.error("Firestore saveUser failed:", e);
      }
    }
    res.json({ success: true });
  });

  // DELETE /api/users/:id
  app.delete("/api/users/:id", async (req, res) => {
    const id = req.params.id;
    
    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (dbLocal.users) {
      dbLocal.users = dbLocal.users.filter((u) => u.id !== id);
      saveDatabase(dbLocal);
    }

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "users", id));
      } catch (e) {
        console.error("Firestore deleteUser failed:", e);
      }
    }
    res.json({ success: true });
  });

  // GET /api/students
  app.get("/api/students", async (req, res) => {
    if (firestoreDb) {
      try {
        const qSnaps = await getDocs(collection(firestoreDb, "students"));
        const list = qSnaps.docs.map(d => d.data());
        // Sync local cache
        const dbLocal = loadDatabase();
        dbLocal.students = list;
        saveDatabase(dbLocal);
        return res.json(list);
      } catch (e) {
        console.error("Firestore getStudents failed, falling back to local database:", e);
      }
    }
    const db = loadDatabase();
    res.json(db.students || []);
  });

  // POST /api/students
  app.post("/api/students", async (req, res) => {
    const student = req.body;

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (!dbLocal.students) dbLocal.students = [];
    const idx = dbLocal.students.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      dbLocal.students[idx] = student;
    } else {
      dbLocal.students.push(student);
    }
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "students", student.id), student);
      } catch (e) {
        console.error("Firestore saveStudent failed:", e);
      }
    }
    res.json({ success: true });
  });

  // DELETE /api/students/:id
  app.delete("/api/students/:id", async (req, res) => {
    const id = req.params.id;

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (dbLocal.students) {
      dbLocal.students = dbLocal.students.filter((s) => s.id !== id);
    }
    // Cascade delete associated payments in the local cache
    if (dbLocal.payments) {
      dbLocal.payments = dbLocal.payments.filter((p) => p.studentId !== id);
    }
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "students", id));
        
        // Cascade delete associated payments in Firestore
        const paymentsRef = collection(firestoreDb, "payments");
        const qSnaps = await getDocs(paymentsRef);
        const batch = writeBatch(firestoreDb);
        let hasDeleted = false;
        qSnaps.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.studentId === id) {
            batch.delete(docSnap.ref);
            hasDeleted = true;
          }
        });
        if (hasDeleted) {
          await batch.commit();
        }
      } catch (e) {
        console.error("Firestore deleteStudent failed:", e);
      }
    }
    res.json({ success: true });
  });

  // GET /api/payments
  app.get("/api/payments", async (req, res) => {
    if (firestoreDb) {
      try {
        const qSnaps = await getDocs(collection(firestoreDb, "payments"));
        const list = qSnaps.docs.map(d => d.data());
        // Sync local cache
        const dbLocal = loadDatabase();
        dbLocal.payments = list;
        saveDatabase(dbLocal);
        return res.json(list);
      } catch (e) {
        console.error("Firestore getPayments failed, falling back to local database:", e);
      }
    }
    const db = loadDatabase();
    res.json(db.payments || []);
  });

  // POST /api/payments
  app.post("/api/payments", async (req, res) => {
    const payment = req.body;

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (!dbLocal.payments) dbLocal.payments = [];
    const idx = dbLocal.payments.findIndex((p) => p.id === payment.id);
    if (idx >= 0) {
      dbLocal.payments[idx] = payment;
    } else {
      dbLocal.payments.push(payment);
    }
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "payments", payment.id), payment);
      } catch (e) {
        console.error("Firestore savePayment failed:", e);
      }
    }
    res.json({ success: true });
  });

  // POST /api/payments/batch
  app.post("/api/payments/batch", async (req, res) => {
    const payments = req.body;
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: "Payments must be an array" });
    }

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (!dbLocal.payments) dbLocal.payments = [];
    payments.forEach((p) => {
      const idx = dbLocal.payments.findIndex((exist) => exist.id === p.id);
      if (idx >= 0) {
        dbLocal.payments[idx] = p;
      } else {
        dbLocal.payments.push(p);
      }
    });
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        // Break batch writes into chunks of 400 to prevent firestore size overflow error
        for (let i = 0; i < payments.length; i += 400) {
          const chunk = payments.slice(i, i + 400);
          const batch = writeBatch(firestoreDb);
          chunk.forEach((p) => {
            batch.set(doc(firestoreDb, "payments", p.id), p);
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Firestore savePayments batch failed:", e);
      }
    }
    res.json({ success: true });
  });

  // DELETE /api/payments/:id
  app.delete("/api/payments/:id", async (req, res) => {
    const id = req.params.id;

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (dbLocal.payments) {
      dbLocal.payments = dbLocal.payments.filter((p) => p.id !== id);
      saveDatabase(dbLocal);
    }

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "payments", id));
      } catch (e) {
        console.error("Firestore deletePayment failed:", e);
      }
    }
    res.json({ success: true });
  });

  // POST /api/seed
  app.post("/api/seed", async (req, res) => {
    const { users, students, payments, terms } = req.body;
    
    // Save to local cache backup
    const dbLocal = loadDatabase();
    dbLocal.users = users || dbLocal.users;
    dbLocal.students = students || dbLocal.students;
    dbLocal.payments = payments || dbLocal.payments;
    dbLocal.terms = terms || dbLocal.terms;
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        const seedCol = async (colName: string, items: any[]) => {
          if (!items || items.length === 0) return;
          for (let i = 0; i < items.length; i += 400) {
            const chunk = items.slice(i, i + 400);
            const batch = writeBatch(firestoreDb);
            chunk.forEach((item) => {
              if (item && item.id) {
                batch.set(doc(firestoreDb, colName, item.id), item);
              }
            });
            await batch.commit();
          }
        };

        if (users) await seedCol("users", users);
        if (students) await seedCol("students", students);
        if (payments) await seedCol("payments", payments);
        if (terms) await seedCol("terms", terms);
      } catch (e) {
        console.error("Firestore complete seeding failed:", e);
      }
    }
    res.json({ success: true });
  });

  // GET /api/terms
  app.get("/api/terms", async (req, res) => {
    if (firestoreDb) {
      try {
        const qSnaps = await getDocs(collection(firestoreDb, "terms"));
        const list = qSnaps.docs.map(d => d.data());
        // Sync local cache
        const dbLocal = loadDatabase();
        dbLocal.terms = list;
        saveDatabase(dbLocal);
        return res.json(list);
      } catch (e) {
        console.error("Firestore getTerms failed, falling back to local database:", e);
      }
    }
    const db = loadDatabase();
    res.json(db.terms || []);
  });

  // POST /api/terms
  app.post("/api/terms", async (req, res) => {
    const term = req.body;

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (!dbLocal.terms) dbLocal.terms = [];
    const idx = dbLocal.terms.findIndex((t) => t.id === term.id);
    if (idx >= 0) {
      dbLocal.terms[idx] = term;
    } else {
      dbLocal.terms.push(term);
    }
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "terms", term.id), term);
      } catch (e) {
        console.error("Firestore saveTerm failed:", e);
      }
    }
    res.json({ success: true });
  });

  // POST /api/terms/batch
  app.post("/api/terms/batch", async (req, res) => {
    const terms = req.body;
    if (!Array.isArray(terms)) {
      return res.status(400).json({ error: "Terms must be an array" });
    }

    // Save to local cache backup
    const dbLocal = loadDatabase();
    dbLocal.terms = terms;
    saveDatabase(dbLocal);

    if (firestoreDb) {
      try {
        for (let i = 0; i < terms.length; i += 400) {
          const chunk = terms.slice(i, i + 400);
          const batch = writeBatch(firestoreDb);
          chunk.forEach((t) => {
            batch.set(doc(firestoreDb, "terms", t.id), t);
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Firestore saveTerms batch failed:", e);
      }
    }
    res.json({ success: true });
  });

  // DELETE /api/terms/:id
  app.delete("/api/terms/:id", async (req, res) => {
    const id = req.params.id;

    // Save to local cache backup
    const dbLocal = loadDatabase();
    if (dbLocal.terms) {
      dbLocal.terms = dbLocal.terms.filter((t) => t.id !== id);
      saveDatabase(dbLocal);
    }

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "terms", id));
      } catch (e) {
        console.error("Firestore deleteTerm failed:", e);
      }
    }
    res.json({ success: true });
  });

  const distPath = path.join(process.cwd(), 'dist');
  
  // Make production the default mode and only run in development mode if explicitly set
  const isProduction = process.env.NODE_ENV !== 'development';

  if (!isProduction) {
    console.log("Starting server in development mode...");
    // Dynamically require/import vite only when running in development mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static files...");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
