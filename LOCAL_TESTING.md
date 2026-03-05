# Local Testing for School Explorer

Add this line to /etc/hosts to test subdomain locally:

127.0.0.1  atlas.localhost

Then test:
- Main Domain:   http://localhost:3000  (ERP)
- School Domain: http://atlas.localhost:3000  (Public Site)

The middleware will automatically route:
- atlas.localhost:3000 → /explore pages
- localhost:3000/explore → redirects to atlas.localhost:3000/explore

