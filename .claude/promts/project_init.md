# Project Initialization Workflow

This document defines the required workflow for initializing every new project.

Follow these steps in order.

Do not begin implementing features until initialization is complete.

---

# Phase 1 – Gather Requirements

Before creating files, gather the following information from the user.

## Project Information

- Project name
- Short description
- Main purpose
- Target users

---

## Technical Stack

Determine:

- Programming language
- Framework
- Target operating system(s)
- Build system
- Package manager
- Database (if any)
- External APIs
- Deployment target

---

## Repository

If no Git repository exists:

Ask whether one should be created.

If a repository exists:

- Initialize Git if needed.
- Connect the remote repository.
- Verify the connection.

---

# Phase 2 – Create Project Structure

Create the standard project skeleton defined in PROJECT_SKELETON.md.

Never overwrite existing files.

Only create missing folders and files.

---

# Phase 3 – Documentation

Create or initialize:

README.md

CHANGELOG.md

memory/project_memory.md

memory/project_status.md

memory/architecture.md

memory/tech_stack.md

memory/coding_conventions.md

memory/decisions.md

memory/ticket_memory.md

---

# Phase 4 – Scripts

Create these scripts when appropriate:

setup.bat

run.bat

build.bat

git_commit.bat

clear_cache.bat

release.bat

Scripts should be customized for the project's language and tooling.

---

# Phase 5 – Git

Verify:

- Git initialized
- .gitignore created
- Remote connected
- Initial commit ready

Do not push unless the user approves.

---

# Phase 6 – Initial Ticket

Create:

TICKET-0001

Type:

Project Initialization

Document:

- Initial setup
- Project structure
- Tooling
- Dependencies

Close the ticket after successful initialization.

---

# Phase 7 – Populate Memory

Update:

project_status.md

project_memory.md

architecture.md

tech_stack.md

Record all known project information.

---

# Phase 8 – Verify

Confirm:

✓ Folder structure exists

✓ Documentation exists

✓ Scripts exist

✓ Git configured

✓ Memory initialized

✓ Ticket created

---

# Phase 9 – Ready for Development

Summarize:

- Project created
- Stack
- Build method
- Git status
- Current version
- First recommended task

Wait for the user's first feature request.