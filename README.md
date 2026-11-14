# FacultyFlow V2 — Four-Portal Edition

A local full-stack student demo for a faculty leave management workflow. It includes exactly four roles:
- STUDENT
- FACULTY
- HOD
- ADMIN

There is **no HR role or HR portal**.

## Workflow
Faculty submits a request → HOD reviews → Admin gives final approval.
Students can see only approved faculty leave information. Student-facing endpoints do not return the private leave reason or approver comments.

## Technology
HTML, CSS, vanilla JavaScript, Bootstrap 5, Node.js, Express, MySQL 8, bcrypt and JWT.

## Requirements
- Node.js 20+
- MySQL Server 8+
- MySQL Workbench (recommended)

## Setup (Windows)
1. Extract the ZIP to a folder such as `D:\SGTU\Projects\FacultyFlow_V2`.
2. Open that folder in VS Code.
3. In MySQL Workbench, open and execute `database/schema.sql`.
4. In the VS Code terminal run:
   ```cmd
   copy .env.example .env
   ```
5. Open `.env`; set your MySQL password and a long private JWT_SECRET. Do not share `.env`.
6. Install dependencies:
   ```cmd
   npm install
   ```
7. Create the first Admin:
   ```cmd
   node scripts/create-admin.js ADM001 "Demo Admin" admin@example.com "UseYourOwnStrongPassword123!" Administration
   ```
   Use a private password of at least 10 characters. The example is not a password to reuse.
8. Start:
   ```cmd
   npm start
   ```
9. Open http://localhost:3000 and sign in with the Admin email and password you created.

## First setup after Admin login
1. Open User management.
2. Create one HOD in the target department.
3. Create faculty accounts in that same department.
4. Create student accounts.
5. Add leave balances using the Admin balance endpoint or database (the Admin UI balance setup is a follow-on enhancement).
6. Sign out and test each role with its own account.

## Important demo limitations
- This is a learning/demo baseline, not a production-ready university deployment.
- The SGT University visual theme is an inspired, replaceable theme, not a claim of official branding. The `FF` monogram is a placeholder. Replace it only with a logo/brand asset you are authorised to use.
- The login page uses a remotely hosted campus building background image; replace with a licensed/official campus image if authorised, or use a local asset.
- Leave duration is calendar days; holiday/weekend rules are not configured.
- Leave quota validation, overlapping application checks, cancellation, delegation, notifications, timetable integration, CSV/PDF export, automated tests, backups and production deployment hardening are not implemented yet.
- Leave balance usage is posted on final approval; opening balances should be configured by Admin before real testing. The demo currently records usage but does not enforce a balance limit.
- JWT is stored in sessionStorage for this local demo. Production should use secure, httpOnly cookies, HTTPS, CSRF protection, rate limiting, stronger audit controls and a security review.
- Use synthetic demo data only. Do not enter real student or employee personal data without university authorisation.
- Do not expose the server publicly or deploy this demo as an official SGT University service.
