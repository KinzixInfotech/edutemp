**Task: Implement Chat + Notifications for EduBreezy (keep architecture consistent with existing codebase)**

### Goal

Add a **structured messaging system** (teacher ↔ parent ↔ student ↔ staff) with **realtime updates, push notifications, and strict security controls**. Maintain existing **UI patterns, API structure, database conventions, and design system** already used in the project.

---

# 1. Communication Structure (do NOT allow open messaging)

Use controlled conversations:

**Parent → Teacher**

* Parent can only message teachers who teach their child.

**Teacher → Class**

* Teachers can message class groups (students/parents).

**Teacher ↔ Teacher**

* Staff internal messaging.

**Admin**

* Can view conversations for moderation/audit.

Do NOT implement:

* global parent messaging
* student-to-student chat
* unrestricted teacher list messaging

---
# 3. Realtime Messaging

Use **Supabase Realtime on messages table**.

Clients subscribe per conversation:

* subscribe only to messages where `conversation_id = X`
* never subscribe to entire table

Realtime is only for **live updates while chat is open**.

---

# 4. Push Notifications

Use **Firebase Cloud Messaging (FCM)**.

Flow:

1. message inserted into DB
2. Edge function / server process triggers
3. fetch participants
4. skip sender
5. check mute settings
6. send push notification

Push notifications must **never be triggered from frontend**.

---

# 5. Mute Notifications

Per conversation mute options:

* 1 hour
* 8 hours
* 1 day
* indefinitely

Check:

```
if mute_until > now()
skip notification
```

---

# 6. Message Deletion

Use **soft delete only**.

When deleted:

* set `deleted_at`
* keep message record

UI shows:

> "This message was deleted"

Do not permanently remove records immediately.

Admins may delete inappropriate messages.

---

# 7. Attachments

Use **cloufalre r2 **.

Allowed file types:

* pdf
* jpg
* png
* docx

Limit file size (~10MB).

Store file URL in message record.

---

# 8. Security (Critical)

Enable **Row Level Security on all tables**.

Rules:

User can read messages only if they are a participant.

Example logic:

```
conversation_participants.user_id = auth.uid()
```

Also enforce:

* school_id isolation (multi-tenant safety)
* sender must belong to conversation
* UUID IDs (avoid ID enumeration)

---

# 9. Role Permissions

Parents:

* message teachers of their child

Students:

* message teachers of their class

Teachers:

* message students/parents in their class
* message other teachers

Admin:

* read-only access to all chats within school

Admins cannot impersonate users.

---

# 10. Rate Limiting

Prevent spam:

Example limits:

* 10 messages per minute
* attachment limits
* notification limits

---

# 11. Message Sanitization

Prevent XSS.

Sanitize message content before rendering.

Use something like:

* DOMPurify / sanitize-html

Never render raw HTML from messages.

---

# 12. UI Consistency

Important:

* reuse existing **design system**
* follow existing **API structure**
* follow existing **component patterns**
* maintain consistent spacing, typography, and states

Chat UI should match the rest of the ERP.

---

# 13. Admin Audit Panel

Admin should be able to:

* search conversations
* view communication logs
* moderate messages
* see reports

Admins cannot edit messages.

---

# 14. Implementation Priorities (v1)

Build only:

1. Parent ↔ Teacher chat
2. Teacher → Class broadcast
3. Teacher ↔ Teacher chat
4. Realtime messaging
5. Push notifications
6. Mute conversation
7. Soft delete messages

Advanced features can come later.

---

# 15. Architecture

Use existing stack:

* Supabase Postgres
* Supabase Realtime
* Supabase cloudflare r2
* Supabase Edge Functions
* Firebase Cloud Messaging

Ensure all new APIs follow the **same conventions used elsewhere in the project**.

---

End goal:
**structured communication system for schools that is secure, scalable, and consistent with the EduBreezy platform.**
