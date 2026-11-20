/* Privacy policy and terms of use for theextracoach.com/privacy/ and /terms/.
   Plain language on purpose. Keep it true to what the app actually does: if the app starts collecting
   something new or uses a new service, update this file, change UPDATED, and run node tools/showcase/build.js. */
const UPDATED="November 20, 2026", CONTACT="coach@theextracoach.com";
module.exports={UPDATED,CONTACT,
privacy:{title:"Privacy Policy",lede:"The Extra Coach is an app for coaching staffs to plan practices, draw plays, run the season calendar and share it with players and families. This page explains what we collect, why, who helps us run the app, and how to get your information deleted.",
sections:[
["The short version",[
 "We collect what the app needs to work: your account, and the team information you and your staff put in.",
 "We don't sell your information, and we don't show ads in the app.",
 "Coaches control their team's information. You can change or delete it any time, and you can delete your whole account in Settings.",
 `Questions or requests: email <a href="mailto:${CONTACT}">${CONTACT}</a>.`]],
["What we collect",[
 "<b>Your account.</b> Your name and email address, and a password if you sign up with one. Passwords are stored encrypted by our database provider; we can't see them. If you sign in with Google or Facebook, we receive your name and email from them.",
 "<b>Team information you enter.</b> Team names, logos and colors; practice plans, drills and plays; the season calendar; game results, stats, gameplans and scouting notes; and rosters. A roster can include players' names and numbers and, if a coach adds them, parent or guardian names, phone numbers and email addresses.",
 "<b>Information families enter.</b> When a parent uses a game-day food sign-up link, they can enter their name and what they're bringing. Parents don't need an account.",
 "<b>Photos you choose to import.</b> When you use “Add from a photo,” the photo is sent to our AI provider to read it (for example, a roster or a schedule). We keep the results you choose to save, plus a count of how many photos your team has imported. We don't keep the photo.",
 "<b>How the app is used.</b> Which days you open the app, how many times, how long each visit lasts, which features are used, and how you found us (for example, a link from another coach). We use this to improve the app. It is tied to your account and visible only to the app's owner.",
 "<b>Homepage visits.</b> We count, anonymously, how many people visit our homepage, how far down they scroll and whether they start signing up, grouped by the link they came from (for example, our Facebook ad). We don't record names, email addresses or IP addresses for this, and we don't use cookies to do it.",
 "<b>Information stored on your device.</b> The app saves some settings on your phone or computer (for example, the last team you opened and your court look) so it opens quickly. You can clear these from your browser."]],
["What we don't collect",[
 "We don't ask for birthdates, home addresses, grades, health or medical information, or payment information, and we ask coaches not to enter them.",
 "We don't use advertising trackers in the app, and we don't sell or rent anyone's information."]],
["How we use it",[
 "To run the app: save your team's work, share it with the staff you invite, and show families the calendar or sign-up pages you send them.",
 "To keep the app secure and working, and to fix problems.",
 "To understand which features coaches use so we can make the app better.",
 "To email you about your account (for example, a password reset). We won't send you marketing email unless you ask for it, and every marketing email will have an unsubscribe link."]],
["Who can see your team's information",[
 "<b>Your staff.</b> Coaches you invite to your team can see it, and edit it if the head coach allows. View-only members can see but not change it.",
 "<b>People you send links to.</b> Some pages are made to be shared: the parent calendar, play links for players, the food sign-up page, and a play you send to another coach. Anyone with one of those links can view that page, so share them the way you'd share a team group text. A coach can turn a link off or change it at any time.",
 "<b>Nobody else.</b> Other coaches using the app can't see your team."]],
["Companies that help us run the app",[
 "<b>Supabase</b> stores the database and handles sign-in.",
 "<b>GitHub Pages and Cloudflare</b> host and deliver the website and app.",
 "<b>Anthropic</b> reads photos you choose to import (AI). Per its commercial terms, information sent through its API isn't used to train its models.",
 "<b>Google and Facebook</b>, only if you choose to sign in with them.",
 "They handle information only to provide their service to us. We may also share information if the law requires it, or to protect someone's safety."]],
["Student and minor information",[
 "The Extra Coach is made for adults: coaches and staff. Students don't create accounts.",
 "When a coach enters a roster, the coach (and their school or organization) decides what goes in it and stays in control of it. We use roster information only to run the app for that team, and we delete it when the coach deletes it, deletes the team, or asks us to.",
 `If you're a parent and want information about your child removed, ask your child's coach, or email us at <a href="mailto:${CONTACT}">${CONTACT}</a> and we'll help.`]],
["Keeping it safe",[
 "Each team's information is locked so only that team's staff can read or change it. Connections to the app are encrypted. We limit who can access the system and protect our own accounts with two-step sign-in.",
 "No system is perfect. If we ever learn of a breach that affects your information, we'll tell you as the law requires."]],
["Keeping and deleting information",[
 "We keep your account and team information while you use the app.",
 "<b>Delete your account:</b> Settings → Your account → Delete my account. Teams that only you coach are deleted with everything in them. Teams with other staff stay with them. Usage history tied to your account is deleted too.",
 `Or email <a href="mailto:${CONTACT}">${CONTACT}</a> and we'll do it for you. Backup copies are cleared on a rolling basis.`]],
["Changes",[
 "If we change this policy in a way that matters, we'll update the date at the top and let coaches know in the app."]],
["Contact",[
 `Email <a href="mailto:${CONTACT}">${CONTACT}</a> with any question or request about your information.`]]
]},
terms:{title:"Terms of Use",lede:"These terms are the agreement between you and The Extra Coach when you use the app and website. By creating an account or using the app, you agree to them.",
sections:[
["Using the app",[
 "You need to be an adult (18 or older) to create an account. The Extra Coach is for coaches, staff and team organizers.",
 "Keep your password private. You're responsible for what happens in your account.",
 "Use the app for coaching and team purposes, and follow your school's, league's or organization's rules."]],
["Your team's information",[
 "What you and your staff put in the app (plans, plays, rosters, schedules and the rest) belongs to you. You give us permission to store it and show it to the people you share it with, only so we can run the app for you.",
 "Only enter information you have the right to share. Rosters should hold only what you need to coach the team: we recommend names, numbers and optional parent contact information, and nothing sensitive like birthdates, addresses or medical information.",
 "If your school or organization has rules about student information, you're responsible for following them when you use the app.",
 "Be careful with share links: anyone with a link can see that page."]],
["What's not allowed",[
 "Don't use the app to harass anyone, post anything unlawful, or share someone's information without permission.",
 "Don't try to get into another team's information, break the app, or copy the app or its code.",
 "We can suspend or close accounts that break these rules."]],
["Our content",[
 "The app, its design, and the plays, drills and guides we publish belong to The Extra Coach. You're welcome to use them for your team, print them for practice and share our public pages."]],
["Free service, no guarantees",[
 "The Extra Coach is free right now. If we ever offer paid features, we'll tell you first and nothing will be charged without your agreement.",
 "We work hard to keep the app running and your information safe, but the app is provided “as is.” We can't promise it will always be available or error-free. Keep backups of anything important (Settings → Export).",
 "To the fullest extent the law allows, The Extra Coach isn't liable for indirect or consequential losses, or for lost information, from using the app."]],
["Ending",[
 "You can stop using the app and delete your account at any time in Settings. We may change, pause or end the service; if we end it, we'll give coaches reasonable notice to export their information."]],
["Changes and law",[
 "We may update these terms. If a change matters, we'll update the date at the top and let coaches know in the app. Continuing to use the app means you accept the new terms.",
 "These terms are governed by the laws of the State of Missouri, USA."]],
["Contact",[
 `Questions? Email <a href="mailto:${CONTACT}">${CONTACT}</a>. Our privacy policy is at <a href="/privacy/">theextracoach.com/privacy</a>.`]]
]}};
