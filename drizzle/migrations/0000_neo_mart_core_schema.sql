-- ============ ROLES ============
create type public.app_role as enum ('admin', 'staff', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMP TRIGGER ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict (user_id, role) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ CATALOG ============
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  icon text not null default 'sparkles',
  accent text not null default 'blue',
  kind text not null default 'platform',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.service_categories to anon, authenticated;
grant all on public.service_categories to service_role;
alter table public.service_categories enable row level security;
create policy "public read categories" on public.service_categories for select to anon, authenticated using (is_active);
create policy "admins manage categories" on public.service_categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  unit text not null default 'unit',
  price_per_unit numeric(12,4) not null default 0,
  min_quantity int not null default 1,
  max_quantity int not null default 100000,
  delivery_time text not null default '24-72 hours',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "public read services" on public.services for select to anon, authenticated using (is_active);
create policy "admins manage services" on public.services for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger services_updated_at before update on public.services
for each row execute function public.set_updated_at();

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id),
  target_link text not null,
  quantity int not null,
  unit_price numeric(12,4) not null,
  total_amount numeric(14,2) not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders select" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "admins select orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update orders" on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create index orders_user_idx on public.orders(user_id, created_at desc);

-- ============ TRANSACTIONS ============
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  amount numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  description text,
  reference text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own transactions select" on public.transactions for select to authenticated using (auth.uid() = user_id);
create policy "admins select transactions" on public.transactions for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create index transactions_user_idx on public.transactions(user_id, created_at desc);

-- ============ SUPPORT ============
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'general',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "own tickets select" on public.support_tickets for select to authenticated using (auth.uid() = user_id);
create policy "own tickets insert" on public.support_tickets for insert to authenticated with check (auth.uid() = user_id);
create policy "admins all tickets" on public.support_tickets for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger tickets_updated_at before update on public.support_tickets
for each row execute function public.set_updated_at();

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;
alter table public.ticket_messages enable row level security;
create policy "ticket owner reads messages" on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy "ticket owner writes messages" on public.ticket_messages for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy "admins all ticket messages" on public.ticket_messages for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============ CONTACT ============
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);
grant insert on public.contact_messages to anon, authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "anyone can contact" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "admins read contact" on public.contact_messages for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ============ SEED CATEGORIES ============
insert into public.service_categories (slug, name, tagline, description, icon, accent, kind, sort_order) values
('instagram','Instagram','Growth, content and campaigns','Content promotion, account management, analytics and campaign management for Instagram.','instagram','pink','platform',1),
('youtube','YouTube','Video and channel growth','Video promotion, channel management, analytics and advertising campaigns.','youtube','red','platform',2),
('tiktok','TikTok','Short-form reach','Content promotion, campaign management and analytics for TikTok.','music','cyan','platform',3),
('facebook','Facebook','Pages and paid social','Page management, content promotion and advertising campaigns.','facebook','blue','platform',4),
('telegram','Telegram','Channels and communities','Channel and community management plus promotional campaigns.','send','sky','platform',5),
('discord','Discord','Servers and communities','Server setup, community management, moderation and promotional campaigns.','message-circle','violet','platform',6),
('x-twitter','X (Twitter)','Real-time presence','Account and content management plus advertising campaigns.','twitter','slate','platform',7),
('linkedin','LinkedIn','B2B authority','Company page management, content campaigns and analytics.','linkedin','blue','platform',8),
('pinterest','Pinterest','Visual discovery','Account management, content promotion and analytics.','image','rose','platform',9),
('reddit','Reddit','Community strategy','Community and content strategy plus advertising campaigns.','flame','orange','platform',10),
('social-media-management','Social Media Management','Always-on account care','Account management, scheduling, content calendars, community management, moderation and reporting.','layout-dashboard','indigo','solution',11),
('advertising','Advertising','Paid media that performs','Campaign setup, management, audience targeting, ad optimization and performance reporting.','target','amber','solution',12),
('content','Content','Creative that converts','Post creation, short-form video editing, thumbnail design, copywriting and content strategy.','pen-tool','emerald','solution',13),
('analytics','Analytics','Decisions backed by data','Account audits, performance reports, competitor analysis, engagement analytics and campaign reports.','bar-chart-3','cyan','solution',14),
('branding','Branding','A profile worth following','Profile setup and optimization, banner and cover design, and social media templates.','palette','purple','solution',15);

-- ============ SEED SERVICES ============
insert into public.services (category_id, slug, name, short_description, description, unit, price_per_unit, min_quantity, max_quantity, delivery_time, features, is_featured, sort_order)
select c.id, s.slug, s.name, s.short_desc, s.descr, s.unit, s.price, s.minq, s.maxq, s.delivery, s.features::jsonb, s.featured, s.ord
from (values
('instagram','instagram-content-promotion','Instagram Content Promotion','Targeted promotion for reels, posts and stories.','Managed promotion of your Instagram content to relevant audiences, with creative guidance and weekly performance reporting.','post',24.00,1,200,'24-72 hours','["Audience research","Creative guidance","Weekly reporting"]',true,1),
('instagram','instagram-account-management','Instagram Account Management','Full monthly account management.','End-to-end management of your Instagram account: calendar, publishing, community replies and monthly reporting.','month',349.00,1,12,'Starts within 3 days','["Content calendar","Daily community management","Monthly report"]',true,2),
('instagram','instagram-analytics','Instagram Analytics & Audit','Deep audit of your account performance.','A structured audit of content, audience and engagement with a prioritised action plan.','audit',129.00,1,10,'5 business days','["Content audit","Audience insights","Action plan"]',false,3),
('instagram','instagram-campaign-management','Instagram Campaign Management','Managed paid campaigns on Instagram.','Campaign setup, targeting, creative testing and optimisation, billed per campaign month.','month',299.00,1,12,'Starts within 3 days','["Campaign setup","A/B creative testing","Optimisation"]',false,4),
('youtube','youtube-video-promotion','YouTube Video Promotion','Promote a video to the right viewers.','Promotion of a single video to targeted viewers with retention-focused optimisation.','video',39.00,1,100,'48-96 hours','["Keyword targeting","Retention tracking","Report"]',true,1),
('youtube','youtube-channel-management','YouTube Channel Management','Monthly channel operations.','Upload scheduling, metadata optimisation, thumbnails coordination and community tab management.','month',429.00,1,12,'Starts within 3 days','["Metadata optimisation","Upload scheduling","Community management"]',false,2),
('youtube','youtube-analytics','YouTube Analytics Report','Understand what your audience watches.','A full analytics review covering retention, traffic sources, CTR and topic opportunities.','report',149.00,1,10,'5 business days','["Retention analysis","CTR breakdown","Topic roadmap"]',false,3),
('youtube','youtube-ads','YouTube Advertising Campaigns','In-stream and shorts ad campaigns.','Setup and ongoing management of YouTube ad campaigns including audience and bidding strategy.','month',349.00,1,12,'Starts within 3 days','["Audience strategy","Bid management","Performance reporting"]',false,4),
('tiktok','tiktok-content-promotion','TikTok Content Promotion','Push your best clips further.','Targeted promotion for TikTok videos with hook analysis and performance tracking.','video',29.00,1,200,'24-72 hours','["Hook analysis","Targeted promotion","Report"]',true,1),
('tiktok','tiktok-campaign-management','TikTok Campaign Management','Managed TikTok ad campaigns.','Spark ads and in-feed campaign setup, creative rotation and weekly optimisation.','month',319.00,1,12,'Starts within 3 days','["Spark ads","Creative rotation","Weekly optimisation"]',false,2),
('tiktok','tiktok-analytics','TikTok Analytics','Performance and trend reporting.','Trend-aware analytics covering watch time, completion rate and follower conversion.','report',119.00,1,10,'5 business days','["Watch-time analysis","Trend mapping","Recommendations"]',false,3),
('facebook','facebook-page-management','Facebook Page Management','Monthly page operations.','Publishing, community responses and page hygiene handled for you each month.','month',299.00,1,12,'Starts within 3 days','["Scheduled publishing","Inbox management","Monthly report"]',false,1),
('facebook','facebook-content-promotion','Facebook Content Promotion','Boost posts with real strategy.','Promotion of selected posts with audience targeting and creative recommendations.','post',22.00,1,200,'24-72 hours','["Audience targeting","Creative notes","Report"]',false,2),
('facebook','facebook-ads','Facebook Advertising Campaigns','Full-funnel paid social.','Campaign architecture, audience testing, creative iteration and conversion tracking.','month',379.00,1,12,'Starts within 3 days','["Full-funnel setup","Audience testing","Conversion tracking"]',true,3),
('telegram','telegram-channel-management','Telegram Channel Management','Keep your channel active and clean.','Posting schedule, moderation and member engagement for Telegram channels and groups.','month',229.00,1,12,'Starts within 3 days','["Posting schedule","Moderation","Engagement prompts"]',false,1),
('telegram','telegram-promotional-campaign','Telegram Promotional Campaign','Reach relevant communities.','A managed promotional campaign across relevant Telegram communities and ad placements.','campaign',189.00,1,50,'5-7 business days','["Placement research","Copywriting","Campaign report"]',false,2),
('discord','discord-server-setup','Discord Server Setup','A server built to scale.','Complete server architecture: channels, roles, permissions, onboarding and automation.','server',249.00,1,20,'5-7 business days','["Channel architecture","Roles & permissions","Onboarding flow"]',true,1),
('discord','discord-community-management','Discord Community Management','Daily community and moderation.','Active community management with moderation coverage and engagement programming.','month',329.00,1,12,'Starts within 3 days','["Daily moderation","Event programming","Monthly report"]',false,2),
('discord','discord-promotional-campaign','Discord Promotional Campaign','Grow an engaged server.','Promotion across relevant servers and communities with engagement-first messaging.','campaign',199.00,1,50,'5-7 business days','["Community research","Messaging","Report"]',false,3),
('x-twitter','x-account-management','X Account Management','Consistent posting and replies.','Monthly management of your X account including posting cadence and reply strategy.','month',279.00,1,12,'Starts within 3 days','["Posting cadence","Reply strategy","Monthly report"]',false,1),
('x-twitter','x-advertising','X Advertising Campaigns','Paid amplification on X.','Campaign setup, targeting and optimisation for X ad campaigns.','month',299.00,1,12,'Starts within 3 days','["Targeting strategy","Creative testing","Optimisation"]',false,2),
('linkedin','linkedin-page-management','LinkedIn Company Page Management','B2B presence, handled.','Company page publishing, employee advocacy support and monthly reporting.','month',389.00,1,12,'Starts within 3 days','["Thought-leadership posts","Advocacy support","Monthly report"]',true,1),
('linkedin','linkedin-content-campaign','LinkedIn Content Campaign','Campaigns that reach decision makers.','A structured content campaign targeting your ideal buyer segments.','campaign',299.00,1,50,'7 business days','["ICP targeting","Content series","Campaign report"]',false,2),
('linkedin','linkedin-analytics','LinkedIn Analytics','Pipeline-aware reporting.','Analytics covering follower quality, engagement and content-to-pipeline signals.','report',149.00,1,10,'5 business days','["Follower quality","Engagement analysis","Recommendations"]',false,3),
('pinterest','pinterest-account-management','Pinterest Account Management','Pins that keep working.','Board strategy, pin scheduling and SEO-led descriptions managed monthly.','month',249.00,1,12,'Starts within 3 days','["Board strategy","Pin scheduling","Keyword descriptions"]',false,1),
('pinterest','pinterest-content-promotion','Pinterest Content Promotion','Promote your best pins.','Promotion of selected pins to relevant interest audiences.','pin',18.00,1,300,'24-72 hours','["Interest targeting","Creative notes","Report"]',false,2),
('reddit','reddit-community-strategy','Reddit Community Strategy','Show up without getting removed.','Subreddit research, participation plan and content strategy tailored to Reddit norms.','strategy',219.00,1,20,'7 business days','["Subreddit research","Participation plan","Content calendar"]',false,1),
('reddit','reddit-advertising','Reddit Advertising Campaigns','Paid campaigns on Reddit.','Campaign setup, targeting and optimisation across relevant subreddits.','month',279.00,1,12,'Starts within 3 days','["Subreddit targeting","Creative testing","Optimisation"]',false,2),
('social-media-management','content-scheduling','Content Scheduling','Your calendar, always full.','We schedule and publish approved content across your connected channels.','month',149.00,1,12,'Starts within 2 days','["Multi-channel scheduling","Approval workflow","Publishing log"]',false,1),
('social-media-management','content-calendar','Content Calendar','A month of planned content.','A complete content calendar with themes, hooks and posting cadence.','calendar',179.00,1,12,'5 business days','["Themes & pillars","Hook ideas","Cadence plan"]',true,2),
('social-media-management','community-management','Community Management','Replies that build loyalty.','Daily comment and DM management with escalation handling across your channels.','month',269.00,1,12,'Starts within 3 days','["Comment & DM replies","Escalation handling","Weekly summary"]',false,3),
('social-media-management','moderation','Moderation','Keep the conversation safe.','Moderation coverage with documented rules, filters and incident reporting.','month',229.00,1,12,'Starts within 3 days','["Rule set","Filter setup","Incident reports"]',false,4),
('advertising','campaign-setup','Campaign Setup','Launch clean, launch fast.','One-time setup of tracking, structure, audiences and creative variants for a new campaign.','campaign',249.00,1,25,'5 business days','["Tracking setup","Campaign structure","Creative variants"]',true,1),
('advertising','audience-targeting','Audience Targeting','Reach the people who buy.','Audience research and segment build-out for your paid campaigns.','project',189.00,1,25,'5 business days','["Segment research","Lookalike strategy","Exclusions"]',false,2),
('advertising','ad-optimization','Ad Optimization','Lower cost, better results.','Ongoing optimisation of bids, budgets, creatives and placements.','month',299.00,1,12,'Starts within 3 days','["Bid & budget tuning","Creative iteration","Placement pruning"]',false,3),
('advertising','performance-reporting','Performance Reporting','Know exactly what worked.','A clear monthly performance report with insights and next actions.','report',119.00,1,12,'5 business days','["KPI dashboard","Insight summary","Next actions"]',false,4),
('content','post-creation','Post Creation','Scroll-stopping posts.','Designed and written social posts produced to your brand guidelines.','post',29.00,1,300,'3-5 business days','["Design + copy","2 revisions","Source files"]',true,1),
('content','short-form-video-editing','Short-form Video Editing','Reels, Shorts and TikToks.','Editing of short-form video including captions, pacing and sound design.','video',49.00,1,200,'3-5 business days','["Captions","Sound design","2 revisions"]',true,2),
('content','thumbnail-design','Thumbnail Design','Clicks start here.','High-contrast thumbnails designed and tested for click-through.','thumbnail',25.00,1,200,'2-4 business days','["2 concepts","CTR-focused","Source files"]',false,3),
('content','copywriting','Caption & Copywriting','Words that carry the post.','Captions, hooks and ad copy written in your brand voice.','piece',15.00,1,500,'2-4 business days','["Brand voice","Hook variants","Revisions"]',false,4),
('content','content-strategy','Content Strategy','A plan worth executing.','A documented content strategy covering pillars, formats, cadence and measurement.','project',399.00,1,10,'7-10 business days','["Content pillars","Format plan","Measurement framework"]',false,5),
('analytics','account-audit','Account Audit','Find what is holding you back.','A full audit of your account setup, content and performance with prioritised fixes.','audit',139.00,1,20,'5 business days','["Setup review","Content review","Prioritised fixes"]',false,1),
('analytics','competitor-analysis','Competitor Analysis','Learn from the leaders.','Analysis of up to five competitors covering content, cadence and engagement patterns.','report',189.00,1,20,'5-7 business days','["Up to 5 competitors","Content teardown","Opportunity map"]',true,2),
('analytics','engagement-analytics','Engagement Analytics','Understand your audience.','Deep engagement analysis showing what content earns real interaction.','report',129.00,1,20,'5 business days','["Engagement breakdown","Format comparison","Recommendations"]',false,3),
('analytics','campaign-reports','Campaign Reports','Results, clearly explained.','Post-campaign reporting with attribution notes and learnings.','report',119.00,1,20,'5 business days','["Result summary","Attribution notes","Learnings"]',false,4),
('branding','profile-setup','Social Profile Setup','Launch-ready profiles.','Complete setup of a social profile including bio, links, highlights and visuals.','profile',129.00,1,20,'3-5 business days','["Bio & links","Highlight covers","Visual setup"]',false,1),
('branding','profile-optimization','Profile Optimization','Make every visit count.','Optimisation of an existing profile for clarity, search and conversion.','profile',99.00,1,20,'3-5 business days','["Keyword optimisation","Conversion copy","Visual polish"]',true,2),
('branding','banner-design','Banner & Cover Design','Covers that look expensive.','Custom banner and cover artwork sized for every platform you use.','design',79.00,1,50,'3-5 business days','["Multi-platform sizes","2 concepts","Source files"]',false,3),
('branding','social-templates','Social Media Templates','A consistent look, every time.','A set of reusable, editable templates matched to your brand system.','set',199.00,1,20,'5-7 business days','["10 templates","Editable files","Usage guide"]',false,4)
) as s(cat, slug, name, short_desc, descr, unit, price, minq, maxq, delivery, features, featured, ord)
join public.service_categories c on c.slug = s.cat;