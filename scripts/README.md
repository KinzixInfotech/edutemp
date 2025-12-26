# Add Director and Principal Script

This script adds Director and Principal users to an existing school.

## Configuration

Edit `/scripts/add-director-principal.js` and update these values:

```javascript
const DIRECTOR_DATA = {
  name: 'Director Name',        // ← Change this
  email: 'director@davschool.com',  // ← Change this
  password: 'Director@123',     // ← IMPORTANT: Change this password!
};

const PRINCIPAL_DATA = {
  name: 'Principal Name',       // ← Change this
  email: 'principal@davschool.com', // ← Change this
  password: 'Principal@123',    // ← IMPORTANT: Change this password!
};
```

## How to Run

```bash
# From the project root directory
node scripts/add-director-principal.js
```

## What it does

1. Finds "DAV Public School" in the database
2. Creates Director Supabase auth user
3. Creates Principal Supabase auth user
4. Creates Director and Principal database records
5. Links them to the school

## Output

The script will display the login credentials at the end:

```
📧 Login Credentials:
─────────────────────────────────────
DIRECTOR:
  Email: director@davschool.com
  Password: Director@123

PRINCIPAL:
  Email: principal@davschool.com
  Password: Principal@123
─────────────────────────────────────
```

## Important Notes

- **Change the passwords** in the script before running!
- Make sure your `.env` file has `SUPABASE_SERVICE_ROLE_KEY` configured
- The script will rollback if anything fails
- Only run this once per school to avoid duplicates
