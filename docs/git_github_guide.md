# Comprehensive Git & GitHub Guide
### A Practical Guide Using the Balor Salon Project

This guide explains Git (the version tracking system on your computer) and GitHub (the cloud platform to store your repository). It covers the most common workflows, commands, and concepts using examples from your **Balor Salon Platform** project.

---

## 📁 1. The Core Concept (Simpler Terms)
Think of Git like a **supercharged save system in a video game**:
* **Working Directory:** Your local folder where you edit code (`D:\Balor-Smart_Grooming_and_Salon_Platform`).
* **Staging Area:** Selecting which files you want to include in your next save point.
* **Commit:** Creating a permanent save point in history with a description (e.g., *"Added Barber Selection Page"*).
* **Push:** Syncing your local save points up to the cloud (GitHub).
* **Pull:** Downloading someone else's new save points from the cloud (GitHub) into your local folder.

---

## 🌿 2. Branching (Working in Parallel)
By default, your project lives on the **`main`** branch. If you want to build a new feature (like a *payment gateway*), you shouldn't modify `main` directly because if your code breaks, the whole live app breaks. Instead, you create a new **branch** (a parallel copy).

### **Commands:**
1. **Check what branch you are on:**
   ```bash
   git branch
   ```
2. **Create a new branch named `add-payments`:**
   ```bash
   git checkout -b add-payments
   ```
   *(This copies the code from your current branch and switches your active environment to `add-payments`).*
3. **Switch back to `main`:**
   ```bash
   git checkout main
   ```

### **Balor Project Example:**
If you want to build a feature that lets Shop Owners upload salon images:
1. You run `git checkout -b shop-owner-images`.
2. You write your code safely in that branch.
3. Once it works perfectly, you merge it back into `main`.

---

## 📤 3. Saving & Syncing: Commit, Push, and Pull

### **The Standard Daily Loop:**
When you finish writing code on your laptop, use this loop:

1. **Check what files you modified:**
   ```bash
   git status
   ```
2. **Stage your files:**
   * Stage a single file: `git add backend/server.js`
   * Stage everything: `git add .`
3. **Create the commit (save point):**
   ```bash
   git commit -m "feat: added email notifications on booking"
   ```
4. **Push to GitHub:**
   ```bash
   git push origin main
   ```
   *(Here, `origin` means your GitHub repo, and `main` is the branch you are pushing to).*
5. **Pull updates from GitHub:**
   ```bash
   git pull origin main
   ```
   *(Always run `git pull` before starting work to make sure you have the newest code).*

---

## 🤝 4. Merging (Combining Code)
Once your feature branch is complete, you want to merge it back into the `main` branch.

### **How to Merge:**
1. Switch to the branch you want to merge *into* (usually `main`):
   ```bash
   git checkout main
   ```
2. Merge the feature branch:
   ```bash
   git merge add-payments
   ```
3. Push the merged code to GitHub:
   ```bash
   git push origin main
   ```

---

## 💥 5. Merge Conflicts (When Git Gets Confused)
A **Merge Conflict** happens when two people (or you on two different computers) modify the **exact same line** of the **exact same file** in different ways, and Git doesn't know which version is the correct one.

### **Balor Project Example (How a Conflict Happens):**
Let's say in the backend file `backend/utils/mailer.js`:
* **In your `main` branch**, you edited line 10 to say:
  `const host = 'smtp.gmail.com';`
* **In your `add-emails` branch**, you edited that same line 10 to say:
  `const host = 'smtp.brevo.com';`

When you run `git merge add-emails`, Git will stop and print:
`CONFLICT (content): Merge conflict in backend/utils/mailer.js. Automatic merge failed; fix conflicts and then commit the result.`

---

### **How to Handle and Resolve Conflicts:**

1. **Open the Conflicting File:**
   Open `backend/utils/mailer.js` in VS Code. Git will have inserted conflict markers directly into the code:
   ```javascript
   <<<<<<< HEAD
   const host = 'smtp.gmail.com'; // Your version on main
   =======
   const host = 'smtp.brevo.com';  // Version from the add-emails branch
   >>>>>>> add-emails
   ```

2. **Fix the Code:**
   * VS Code will show convenient buttons like *"Accept Current Change"*, *"Accept Incoming Change"*, or *"Accept Both"*.
   * Manually delete the conflict markers (`<<<<<<<`, `=======`, and `>>>>>>>`) and keep the correct line. 
   * For example, if you decided to use Brevo, edit the file to just show:
     ```javascript
     const host = 'smtp.brevo.com';
     ```

3. **Stage and Commit the Fix:**
   Once you save the file, tell Git the conflict is resolved:
   ```bash
   git add backend/utils/mailer.js
   git commit -m "fix: resolved mailer host merge conflict"
   git push origin main
   ```

---

## 🛠️ 6. Advanced/Useful Git Commands (Beyond the Basics)

### **A. Discarding Local Changes (Undoing Mistakes)**
If you broke your local code and just want to reset a file back to its last saved state:
```bash
git checkout -- backend/server.js
```
*(To discard ALL local unsaved changes, run `git reset --hard HEAD`).*

### **B. Git Stash (Temporarily Saving Work)**
If you are in the middle of writing unfinished code on a branch, but need to switch branches immediately to fix a bug:
1. Save your unfinished changes to a temporary storage shelf:
   ```bash
   git stash
   ```
2. Switch branches, fix the bug, and switch back.
3. Retrieve your unfinished work from the shelf:
   ```bash
   git stash pop
   ```

### **C. Viewing History (Log)**
To see a list of all past commits in your project:
```bash
git log --oneline
```
*(Prints a clean, single-line list of commits).*
