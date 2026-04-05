# GitHub Deployment Guide - Cycle Count Manager

## Step 1: Create a GitHub Repository

### Option A: On GitHub Website
1. Go to https://github.com/new
2. Repository name: `cycle-count-manager`
3. Description: `Inventory cycle counting application with automatic SKU classification`
4. Choose: Public (so others can use it) or Private (only you)
5. **DO NOT** initialize with README, .gitignore, or license (we have these files)
6. Click "Create repository"

### Option B: Using GitHub CLI
```bash
gh repo create cycle-count-manager --public --source=. --remote=origin --push
```

---

## Step 2: Initialize Git in Your Project

Navigate to your project folder:
```bash
cd cycle-count-manager
```

Initialize git:
```bash
git init
```

Add all files:
```bash
git add .
```

Create initial commit:
```bash
git commit -m "Initial commit: Cycle Count Manager application"
```

---

## Step 3: Connect to GitHub

Add remote repository (replace `yourusername` with your GitHub username):
```bash
git remote add origin https://github.com/yourusername/cycle-count-manager.git
```

Push to GitHub:
```bash
git branch -M main
git push -u origin main
```

---

## Step 4: Update package.json

Edit `package.json` and update these fields:

```json
{
  "author": "Your Name",
  "repository": {
    "url": "https://github.com/yourusername/cycle-count-manager.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/cycle-count-manager/issues"
  },
  "homepage": "https://github.com/yourusername/cycle-count-manager#readme"
}
```

Then commit:
```bash
git add package.json
git commit -m "Update package.json with repository information"
git push
```

---

## Step 5: Publish to GitHub Pages (Optional)

To host your app for free on GitHub Pages:

1. Go to your repository settings on GitHub
2. Scroll to "Pages" section
3. Under "Source", select "Deploy from a branch"
4. Select `main` branch
5. Click Save

Your app will be live at: `https://yourusername.github.io/cycle-count-manager/`

To use it: Open `https://yourusername.github.io/cycle-count-manager/cycle-count-app.html`

---

## Project Structure

```
cycle-count-manager/
├── cycle-count-app.html          # Standalone app (MAIN FILE)
├── cycle-count-app.jsx            # React component version
├── inventory_template.xlsx        # Example inventory file
├── README.md                      # User guide
├── TECHNICAL.md                   # Technical documentation
├── package.json                   # Project metadata
├── .gitignore                     # Git ignore rules
├── LICENSE                        # MIT License
└── .git/                         # Git repository (auto-created)
```

---

## Daily Git Workflow

### After making changes:

```bash
# See what changed
git status

# Stage changes
git add .

# Commit with message
git commit -m "Describe your changes here"

# Push to GitHub
git push
```

### Example commits:
```bash
git commit -m "Fix download Excel button"
git commit -m "Update inventory classification algorithm"
git commit -m "Add new features to dashboard"
```

---

## Collaboration (Sharing with Team)

### Give others access:
1. Go to repository "Settings"
2. Click "Collaborators"
3. Add their GitHub username or email
4. They can then clone and push changes

### Clone the repository (for team members):
```bash
git clone https://github.com/yourusername/cycle-count-manager.git
cd cycle-count-manager
```

### Team member workflow:
```bash
# Get latest changes
git pull

# Make changes...

# Push changes
git add .
git commit -m "Description of changes"
git push
```

---

## Useful Git Commands

```bash
# View commit history
git log

# See recent changes
git status

# Undo last commit (before pushing)
git reset --soft HEAD~1

# Check remote URL
git remote -v

# Change remote URL
git remote set-url origin https://github.com/yourusername/new-repo.git
```

---

## Versioning (Tags)

Mark important versions:

```bash
# Create a version tag
git tag v1.0.0

# Push tags to GitHub
git push origin --tags
```

Visit your repository and go to "Releases" to see tagged versions.

---

## README Best Practices

Your `README.md` should include:
- ✅ What the app does
- ✅ How to use it
- ✅ Features
- ✅ Installation instructions
- ✅ Example files
- ✅ License info

**Check your current README.md** - it already has great documentation!

---

## Troubleshooting

### "fatal: not a git repository"
```bash
git init
```

### "Permission denied (publickey)"
You need to set up SSH keys:
https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### "Updates were rejected"
Someone else pushed changes. Pull first:
```bash
git pull origin main
git push
```

---

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Push your files
3. ✅ Enable GitHub Pages (optional)
4. ✅ Share the link with your team
5. ✅ Keep updating as you improve the app

---

## Resources

- Git Tutorial: https://git-scm.com/book/en/v2
- GitHub Docs: https://docs.github.com/
- GitHub Pages: https://pages.github.com/

---

**Your project is ready for GitHub!** 🚀
