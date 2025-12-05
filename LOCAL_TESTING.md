# Local Testing for School Explorer

Add this line to /etc/hosts to test subdomain locally:

127.0.0.1  school.localhost

Then test:
- Main Domain:   http://localhost:3000  (ERP)
- School Domain: http://school.localhost:3000  (Public Site)

The middleware will automatically route:
- school.localhost:3000 → /explore pages
- localhost:3000/explore → redirects to school.localhost:3000/explore

