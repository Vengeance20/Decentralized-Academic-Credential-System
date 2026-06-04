# Running the System

## 1. Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

Install the Ethers library:

```bash
npm install ethers
```

---

## 2. Start the Backend APIs

Move to the directory containing APIs
```bash
cd backend/dev
```

Then open three separate terminal windows and run the following commands:

### Issuance Portal API

```bash
python issuance_api.py
```

### Student Wallet API

```bash
python wallet_api.py
```

### Verifier Portal API

```bash
python verifier_api.py
```

---

## 3. Start the Frontend Application

Open another terminal and run:

```bash
npm run dev
```

---

## 4. Access the Application

Once the frontend has started successfully, open your browser and navigate to:

```text
http://localhost:3000/
```

---

## Notes

* Ensure that Python and Node.js are installed and properly configured.
* All backend APIs should be running before starting the frontend application.
* If you are using a Python virtual environment, activate it before launching the APIs.
