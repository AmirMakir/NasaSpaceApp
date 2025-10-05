# Space Base Designer

A comprehensive 2D space base design game where players construct and optimize modular habitats on the Moon, Mars, or in Earth orbit. The game incorporates realistic constraints based on rocket payload limits, environmental factors, and crew resource requirements.

## Features

### Environment Selection
- **Moon**: 0.16g gravity, no atmosphere, high radiation
- **Mars**: 0.38g gravity, thin CO₂ atmosphere, high radiation  
- **Earth Orbit**: Microgravity, vacuum, extreme radiation

### Module Types
- **Kitchen/Galley**: Food storage, cooking appliances, dishwashing
- **Laboratory**: Science equipment for chemistry, biology, engineering
- **Gym/Exercise Room**: Equipment for maintaining muscle and bone health
- **Sleeping Quarters**: Private or semi-private crew rest areas
- **Hygiene**: Toilet, shower, and water-recycling systems
- **Storage**: Spare parts, tools, equipment, and supplies
- **Medical Bay**: First aid and medical equipment
- **Recreation/Leisure**: Games, VR station, lounge for crew downtime

### Realistic Constraints
- **Rocket Payload Limits**: Base size constrained by fairing dimensions (5.2m for Falcon 9, 8.4m for SLS)
- **Resource Management**: Tracks food, water, oxygen, and exercise requirements
- **Radiation Shielding**: Required protection based on environment
- **Connectivity**: All modules must be connected via corridors

### Mission Scenarios
- **Lunar Research**: 4 crew, 30 days
- **Mars Colony**: 6 crew, 90 days  
- **Orbital Laboratory**: 8 crew, 180 days
- **Custom Mission**: User-defined parameters

## How to Play

### Basic Controls
1. **Select Environment**: Choose Moon, Mars, or Earth Orbit from the dropdown
2. **Set Crew Size**: Adjust the number of crew members (1-12)
3. **Set Mission Duration**: Define mission length in days
4. **Select Module Type**: Click on a module in the palette
5. **Place Modules**: Click and drag to place modules within the base outline
6. **Create Corridors**: Right-click and drag to connect modules
7. **Monitor Resources**: Watch the resource panel for real-time feedback

### Resource Management
The game tracks five key resources:
- **Food**: Based on 3.5kg per crew member per day
- **Water**: Based on 3.8L per crew member per day  
- **Oxygen**: Based on 0.83kg per crew member per day
- **Exercise**: Based on 2 hours per crew member per day
- **Radiation**: Shielding requirements vary by environment

### Status Indicators
- **OK**: Resource capacity is adequate
- **Low**: Resource capacity may be insufficient
- **Critical**: Resource capacity is dangerously low
- **Oversized**: Resource capacity exceeds needs (wasteful)

### Module Status
- **Green Border**: Module size is appropriate
- **Red Border**: Module is too small for crew needs
- **Orange Border**: Module is oversized (wasteful)
- **Yellow Border**: Module is selected

## Technical Implementation

### Architecture
- **Frontend**: HTML5 Canvas with JavaScript
- **Styling**: CSS3 with modern design patterns
- **Data**: JSON-based save/load system
- **Backend**: Express proxy for AI helper (OpenRouter Qwen)

### Key Components
- `SpaceBaseGame` class: Main game controller
- Environment system: Handles different space environments
- Module system: Manages room placement and configuration
- Resource tracking: Real-time calculation of crew needs
- Connectivity validation: Ensures all modules are reachable

### Real-World Data Integration
All numerical values are based on real NASA data:
- Crew resource consumption rates
- Rocket fairing dimensions
- Environmental constraints
- Mission duration requirements

## File Structure
```
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and layout
├── game.js            # Core game logic and mechanics
├── server.js          # Express backend proxy for AI
├── package.json       # Node dependencies and scripts
└── README.md          # This documentation
```

## Browser Compatibility
- Modern browsers with HTML5 Canvas support
- ES6+ JavaScript features required
- Responsive design for desktop and tablet

## Future Enhancements
- Multi-level base construction
- Advanced corridor routing
- Equipment placement within modules
- Power and thermal management
- Mission-specific challenges
- Collaborative design sharing

## AI Helper Setup

1) Install dependencies
```bash
npm install
```

2) Create a `.env` file in the project root:
```env
OPENROUTER_API_KEY=sk-...your_key_here...
```

3) Start the backend
```bash
npm start
```

4) Open `index.html` in your browser. Use the AI panel on the right:
- Toggle "Use AI instead of warnings" to route feedback through AI
- Click "Ask AI" to analyze the current design

This uses model `qwen/qwen3-235b-a22b:free` by default via OpenRouter.

## Deploying to stellarespace.study

1) Point DNS to your server
- Create an A record for `stellarespace.study` pointing to your server's public IP
- Optionally add a `www` CNAME to the root

2) Install Node on the server (Node 18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3) Upload project files (index.html, styles.css, game.js, server.js, package.json, .env)

4) Set environment
```bash
echo "OPENROUTER_API_KEY=sk-..." > .env
```

5) Install and run
```bash
npm install
npm start
```

6) Add a reverse proxy with HTTPS (recommended)
- Using Nginx with Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo tee /etc/nginx/sites-available/stellarespace.study > /dev/null <<'NGINX'
server {
    listen 80;
    server_name stellarespace.study;
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
sudo ln -s /etc/nginx/sites-available/stellarespace.study /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d stellarespace.study --redirect
```

7) Background the Node app
```bash
npm i -g pm2
pm2 start server.js --name space-base
pm2 save
pm2 startup
```

After DNS propagates and SSL is issued, visit `https://stellarespace.study`.

## Educational Value
This game teaches players about:
- Space habitat design principles
- Resource management in extreme environments
- Engineering constraints in space missions
- Real-world space exploration challenges
- Systems thinking and optimization

Perfect for educational settings, STEM programs, and anyone interested in space exploration and engineering!
