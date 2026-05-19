--
-- PostgreSQL database dump
--

\restrict KThlRB5C98GszX6lVCKYt738cFSbSI46GJjNNR0xgfH98hI0LHqQRaUsQH2qGkf

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cache; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache OWNER TO "Magneto";

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO "Magneto";

--
-- Name: cash_shifts; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.cash_shifts (
    id uuid NOT NULL,
    tenant_id character varying(100) NOT NULL,
    user_id character varying(100) NOT NULL,
    terminal_id character varying(50) DEFAULT 'CAJA_01'::character varying NOT NULL,
    opened_at timestamp(0) without time zone NOT NULL,
    closed_at timestamp(0) without time zone,
    starting_cash numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    expected_cash numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    actual_cash numeric(12,2),
    difference numeric(12,2),
    status character varying(255) DEFAULT 'OPEN'::character varying NOT NULL,
    sales_summary json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT cash_shifts_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'CLOSED'::character varying])::text[])))
);


ALTER TABLE public.cash_shifts OWNER TO "Magneto";

--
-- Name: categories; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    sort_order smallint DEFAULT '0'::smallint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.categories OWNER TO "Magneto";

--
-- Name: customers; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.customers (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    company_name character varying(255),
    account_number character varying(50),
    taxable boolean DEFAULT true NOT NULL,
    email character varying(255),
    phone character varying(30),
    address text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.customers OWNER TO "Magneto";

--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO "Magneto";

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: Magneto
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO "Magneto";

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Magneto
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.items (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    item_number character varying(100),
    description text,
    cost_price numeric(15,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    stock numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    reorder_level numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    receiving_quantity numeric(15,2) DEFAULT 1 NOT NULL,
    allow_alt_description boolean DEFAULT false NOT NULL,
    is_serialized boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    min_stock_alert numeric(15,2),
    sell_by character varying(10) DEFAULT 'unit'::character varying NOT NULL,
    unit_label character varying(10) DEFAULT 'und'::character varying
);


ALTER TABLE public.items OWNER TO "Magneto";

--
-- Name: COLUMN items.min_stock_alert; Type: COMMENT; Schema: public; Owner: Magneto
--

COMMENT ON COLUMN public.items.min_stock_alert IS 'Umbral de alerta de stock mínimo. null = sin alerta.';


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO "Magneto";

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO "Magneto";

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: Magneto
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO "Magneto";

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Magneto
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO "Magneto";

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: Magneto
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO "Magneto";

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Magneto
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO "Magneto";

--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO "Magneto";

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: Magneto
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO "Magneto";

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Magneto
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: processed_sync_events; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.processed_sync_events (
    event_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type character varying(30) NOT NULL,
    action character varying(30) NOT NULL,
    entity_id uuid NOT NULL,
    occurred_at timestamp(0) without time zone NOT NULL,
    processed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'OK'::character varying NOT NULL,
    error_message text
);


ALTER TABLE public.processed_sync_events OWNER TO "Magneto";

--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.sale_items (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    item_id uuid NOT NULL,
    line integer DEFAULT 0 NOT NULL,
    description character varying(255),
    serial_number character varying(100),
    quantity_purchased numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    item_cost_price numeric(15,2) NOT NULL,
    item_unit_price numeric(15,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.sale_items OWNER TO "Magneto";

--
-- Name: sale_payments; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.sale_payments (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(30) DEFAULT 'EFECTIVO'::character varying NOT NULL,
    reference character varying(255),
    note text,
    paid_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.sale_payments OWNER TO "Magneto";

--
-- Name: sales; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.sales (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_number character varying(50),
    comment text,
    sale_time timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    terminal_id character varying(30) DEFAULT 'CAJA_01'::character varying NOT NULL,
    customer_id uuid,
    employee_id bigint NOT NULL,
    payment_method character varying(30) DEFAULT 'DIVISA'::character varying NOT NULL,
    status character varying(20) DEFAULT 'PAGADO'::character varying NOT NULL,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    tax_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    paid_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    amount_received numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    change_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    reference character varying(255),
    due_date timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.sales OWNER TO "Magneto";

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO "Magneto";

--
-- Name: store_configs; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.store_configs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.store_configs OWNER TO "Magneto";

--
-- Name: stores; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.stores (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    primary_color character varying(20) DEFAULT '#3B82F6'::character varying NOT NULL,
    logo_url character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    plan character varying(30) DEFAULT 'FREE'::character varying NOT NULL,
    rif character varying(30),
    owner_email character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    trial_ends_at timestamp(0) without time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL
);


ALTER TABLE public.stores OWNER TO "Magneto";

--
-- Name: COLUMN stores.trial_ends_at; Type: COMMENT; Schema: public; Owner: Magneto
--

COMMENT ON COLUMN public.stores.trial_ends_at IS 'Fecha de expiración del trial. null = plan activo/pagado.';


--
-- Name: COLUMN stores.status; Type: COMMENT; Schema: public; Owner: Magneto
--

COMMENT ON COLUMN public.stores.status IS 'active | trial_expired | suspended';


--
-- Name: users; Type: TABLE; Schema: public; Owner: Magneto
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(30),
    address text,
    role character varying(20) DEFAULT 'CASHIER'::character varying NOT NULL,
    telegram_chat_id character varying(255),
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.users OWNER TO "Magneto";

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: Magneto
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO "Magneto";

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Magneto
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.cache (key, value, expiration) FROM stdin;
merxpos-cache-bcv_usd_rate	a:3:{s:4:"rate";d:515.18;s:10:"updated_at";s:25:"2026-05-15T03:14:05+00:00";s:6:"source";s:13:"BCV (Oficial)";}	1778822045
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: cash_shifts; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.cash_shifts (id, tenant_id, user_id, terminal_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, difference, status, sales_summary, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.categories (id, tenant_id, name, sort_order, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.customers (id, tenant_id, first_name, last_name, company_name, account_number, taxable, email, phone, address, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.items (id, tenant_id, name, category, item_number, description, cost_price, unit_price, stock, reorder_level, receiving_quantity, allow_alt_description, is_serialized, created_at, updated_at, deleted_at, min_stock_alert, sell_by, unit_label) FROM stdin;
be04afad-e139-4449-9ae0-d9b56b7bc629	38a95beb-e41e-4949-8224-caf230a9cf2c	prueba	test	\N	\N	0.00	0.00	0.00	0.00	1.00	f	f	2026-05-07 03:04:32	2026-05-07 03:04:32	\N	\N	unit	und
f6eac89d-06ab-41f2-abf5-ba2e77c95aee	38a95beb-e41e-4949-8224-caf230a9cf2c	PRODUCTO LACTEO NUTRILECHE 1/1 LT	Sin Categoría	AI-SCAN-4269	\N	13.70	17.81	0.00	0.00	12.00	f	f	2026-05-07 03:04:32	2026-05-07 03:04:32	\N	\N	unit	und
c79c95b4-e0e3-4317-9742-117453cd9b16	7bbb66d9-0762-47a5-a8f1-6f947427af1e	Queso	Comida	Xfe	\N	5.00	7.90	0.00	5.00	1.00	f	f	2026-05-12 15:27:00	2026-05-12 15:27:00	\N	\N	unit	und
72755900-d2ef-4c08-942b-9d240f7f01cc	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Pasta	Corta	Horizonte Corta	\N	2.10	2.50	0.00	7.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
4e39ee5b-30ad-4847-b888-63043dd9497f	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Aceite	Comestible	900 Gramos	\N	3.22	3.50	0.00	5.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
88f5e57c-8d7d-4d84-b9c5-d51d5ad431cd	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Arroz	1 kilo	Mary	\N	1.20	1.50	0.00	24.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
996ba442-f430-4541-ac79-542c5e1759a1	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Atún aceite	Pacifico	De 170 Gramos	\N	2.50	3.10	0.00	6.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
a2f188fc-6e3d-4924-81f7-4885e8154131	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Azucar	Refinada	900	\N	1.34	1.60	0.00	6.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
51ce7aa4-b452-4f1a-9d5f-71a5741d2d14	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Cafe	Flor de Arauca	De 200 Gramos	\N	2.40	3.20	0.00	13.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
bbb06361-d4e0-49a1-b94d-5576aba257d4	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Caraota	Negra	Kilo	\N	2.00	3.00	0.00	5.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
0635f7f0-14b0-4e84-9c4f-6b0f2ad733c8	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Combo	Pasta , atún y pasta corta	Combo 3 productos	\N	6.00	6.60	0.00	1.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
dffd1a90-524b-4892-9fd5-cec350e0f809	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Diablitos	De 60 Gramos	Plumrose	\N	1.46	1.80	0.00	4.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
36df995c-b75a-4a8f-b241-f05e5d5c3e4d	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Frijol	Vallo	1 kilo	\N	1.00	1.50	0.00	15.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
37fec907-3e79-4b7e-ac51-5b58439899b4	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Frusty	Jugo	Manzana	\N	0.90	1.12	0.00	10.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
a42f3953-5b96-417a-ad80-6d9ca9929e7f	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Harina	Trigo	La Pampa	\N	1.05	1.30	0.00	9.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
f7b53e0b-f613-4204-a93b-ac4428c9c2e8	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Harina Pan	Mary	\N	\N	1.19	1.49	0.00	30.00	1.00	f	f	2026-05-07 18:39:04	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
e21bf798-09a3-4b06-bc0d-122e28a8dbef	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Jabón	Popular	Lavar pequeño	\N	0.81	1.16	0.00	3.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
d0b06411-91a3-4678-b0d1-69db8364e910	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Pasta	Larga	Horizonte	\N	1.50	1.90	0.00	1.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
5af7a850-cd28-4fa2-aa01-c584556246b5	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Refresco	Glup	2 litros	\N	1.00	1.40	0.00	6.00	1.00	f	f	2026-05-08 01:35:55	2026-05-08 19:21:54	2026-05-08 19:21:54	\N	unit	und
9811cc75-e50d-4380-b033-448a0d139fa2	7bbb66d9-0762-47a5-a8f1-6f947427af1e	Harina pan	Comida	Xxff	\N	1.00	2.00	0.00	2.00	1.00	f	f	2026-05-12 02:55:59	2026-05-12 02:55:59	\N	\N	unit	und
f0583a36-8dd1-4413-8c5b-52e4e12d001c	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Caraota	Kilo	Blanca	\N	2.00	2.58	0.00	11.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
4312f8f4-c94c-440b-aa41-3f9733f851e5	7bbb66d9-0762-47a5-a8f1-6f947427af1e	Jamon	Comida	\N	\N	5.00	7.50	0.00	1.00	15.50	f	f	2026-05-13 02:34:24	2026-05-13 03:34:22	2026-05-13 03:34:22	\N	weight	Kg
b2d0619b-6229-4616-805a-d412a255c293	7bbb66d9-0762-47a5-a8f1-6f947427af1e	Jamon	Comida	\N	\N	2.00	4.00	0.00	2.00	10.00	f	f	2026-05-13 03:34:23	2026-05-13 03:34:23	\N	\N	unit	und
05f6dcf5-dcfa-4cea-948b-3583da2ed2e7	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Aceite	Comestible	Un litro	\N	3.22	3.71	0.00	5.00	1.00	f	f	2026-05-08 19:23:37	2026-05-13 19:07:28	2026-05-13 19:07:28	\N	unit	und
f28eef60-21d9-4f27-b538-34195b71e770	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Atún	170 gramos	Aceite	\N	2.50	2.67	0.00	6.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:28	2026-05-13 19:07:28	\N	unit	und
0e75eabd-9f2c-4f7b-b73f-65a6fb0fcb8a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Azucar	900 gramos	Refinada	\N	1.34	1.38	0.00	6.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
5da610e1-d2ab-4a6e-ac47-f5b882a744d1	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Cafe	200 Gramos	Flor de Arauca	\N	2.40	2.93	0.00	13.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
00c246d2-baa3-4dd3-9197-abe105774a5d	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Caraota	Kilo	Negra	\N	2.00	2.58	0.00	5.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
019c35f2-7ad7-4ecc-b966-bb7f414172a0	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Caraota	Kilo	Pintada	\N	1.90	2.00	0.00	5.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
d998fee9-49fa-433f-986c-94633e672e4b	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Cloro	Líquido	Litro	\N	0.70	0.83	0.00	6.00	1.00	f	f	2026-05-09 13:50:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
60b0e283-1621-47f8-858f-e7e6203e7f06	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Combo	3 Artículos	Harina , atún y pasta	\N	5.00	5.69	0.00	1.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
1c77d9f7-939b-489b-b821-9126749b5765	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Desinfectante	Litro	Floral	\N	0.70	0.83	0.00	6.00	1.00	f	f	2026-05-09 13:50:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
0a8bbdaf-ab60-4f70-b087-657d57d91a30	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Frijol	Kilo	Vallo	\N	1.00	1.29	0.00	16.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
d7f980d2-2355-41dd-b80d-f99e11f69539	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Jabón	Litro	Líquido lavaplatos	\N	0.70	0.83	0.00	6.00	1.00	f	f	2026-05-09 13:50:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
f124458d-a15a-4a71-93b6-b080217ed414	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Jabón	Pequeño Blanco	Popular	\N	0.81	1.00	0.00	3.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
63bbf672-2bf2-4f21-80e2-0214471326be	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Masas	Kilo	Pastelitos	\N	1.70	2.15	0.00	3.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
b3b42c8f-8a72-4c49-afdd-af14cd84321d	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Pollo	Picado	520 gramos	\N	1.90	1.98	0.00	5.00	1.00	f	f	2026-05-10 13:53:13	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
6f0c00c2-37f7-4d5e-9a46-ae7ebc00fc03	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Queso	Kilo	Duro blanco	\N	3.32	3.36	0.00	5.00	1.00	f	f	2026-05-08 19:58:44	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
b96b84de-5f19-4df8-b663-4d97fc04b4d3	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Queso	Kilo	Blanco	\N	6.40	6.70	0.00	5.00	1.00	f	f	2026-05-10 03:03:31	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
53eb908c-c89e-4527-91f4-0c0e150e0961	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Refresco	2 litros	Glup negro	\N	0.70	1.21	0.00	6.00	1.00	f	f	2026-05-08 19:48:10	2026-05-13 19:07:29	2026-05-13 19:07:29	\N	unit	und
850176ca-cc2e-479f-9b6f-3cc93c9a80ae	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Pollo	Kilo	Picado	\N	3.50	4.20	0.00	0.00	6.00	f	f	2026-05-13 19:18:37	2026-05-13 19:18:37	\N	\N	weight	und
8c7bfc53-dce6-43e3-bcc1-b2ef93ff441a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Aceite	Litros	Vegetal comestible	\N	3.71	4.30	0.00	5.00	5.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
696a7985-3909-48dc-8139-f1ef0e1f219a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Diablitos	0.60 gramos	Pequeño Plumrose	\N	1.50	1.80	0.00	2.00	4.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
135c70cc-1db5-4cdb-8fa0-c0d2adecac2b	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Jugo	1.5 litros	Frusty	\N	0.96	1.12	0.00	2.00	8.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
2324e0f2-76c2-4e0e-b504-65495a55078a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Harina trigo	Kilo	La.Pampa	\N	1.05	1.30	0.00	4.00	10.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
95bb0e9b-ccbf-420a-9c35-82572bd82a41	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Pasta	Corta kilo	Corta Horizonte	\N	2.15	2.60	0.00	5.00	8.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
623157c0-c6e6-4512-9df0-cd59678962ac	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Pasta	Larga	Horizonte Kilo	\N	1.64	1.80	0.00	1.00	1.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
3cae7133-253c-4427-b209-267f28c94683	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Refresco	2 litros	Glup	\N	1.21	1.40	0.00	2.00	6.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
6d2ceb6d-453d-428b-a579-83be753ad0d3	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Desinfectante	Litro	Rojo	\N	0.75	1.00	0.00	2.00	6.00	f	f	2026-05-14 23:22:14	2026-05-14 23:22:14	\N	\N	unit	und
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
1	default	{"uuid":"cee359bd-298b-46dc-abe3-bfa20f4fbba2","displayName":"App\\\\Notifications\\\\WelcomeUserNotification","job":"Illuminate\\\\Queue\\\\CallQueuedHandler@call","maxTries":null,"maxExceptions":null,"failOnTimeout":false,"backoff":null,"timeout":null,"retryUntil":null,"deleteWhenMissingModels":false,"data":{"commandName":"Illuminate\\\\Notifications\\\\SendQueuedNotifications","command":"O:48:\\"Illuminate\\\\Notifications\\\\SendQueuedNotifications\\":3:{s:11:\\"notifiables\\";O:45:\\"Illuminate\\\\Contracts\\\\Database\\\\ModelIdentifier\\":5:{s:5:\\"class\\";s:15:\\"App\\\\Models\\\\User\\";s:2:\\"id\\";a:1:{i:0;i:6;}s:9:\\"relations\\";a:0:{}s:10:\\"connection\\";s:5:\\"pgsql\\";s:15:\\"collectionClass\\";N;}s:12:\\"notification\\";O:41:\\"App\\\\Notifications\\\\WelcomeUserNotification\\":2:{s:17:\\"temporaryPassword\\";s:12:\\"wBCFyr06u13L\\";s:2:\\"id\\";s:36:\\"9edde6d9-e6ed-43aa-9faf-2db3c8351375\\";}s:8:\\"channels\\";a:1:{i:0;s:4:\\"mail\\";}}","batchId":null},"createdAt":1778073181,"delay":null}	0	\N	1778073181	1778073181
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000001_create_cache_table	1
2	0001_01_01_000001_create_stores_table	1
3	0001_01_01_000002_create_jobs_table	1
4	0001_01_01_000002_create_users_table	1
5	0001_01_01_000003_create_customers_table	1
6	0001_01_01_000004_create_items_table	1
7	0001_01_01_000005_create_sales_table	1
8	0001_01_01_000006_create_sale_items_table	1
9	0001_01_01_000007_create_sale_payments_table	1
10	0001_01_01_000008_create_processed_sync_events_table	1
11	0001_01_01_000009_create_store_configs_table	1
12	0001_01_01_000010_create_cash_shifts_table	1
13	2026_03_28_235315_create_personal_access_tokens_table	1
14	2026_04_02_163800_add_manager_role_to_users_table	1
15	2026_05_12_000001_add_min_stock_alert_to_items	2
16	2026_05_12_000002_set_default_tax_zero_on_sales	2
17	2026_05_12_100000_add_trial_fields_to_stores	2
18	2026_05_12_200000_add_sell_by_and_fix_receiving_qty	3
19	2026_05_12_200001_create_categories_table	3
20	2026_05_12_220000_add_unit_label_to_items	3
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
roydanielcalderon28@gmail.com	$2y$12$ln8Yaod2vsNQOaL2AJ82KewlEwtcWAtTF.73yrnuLRdmFMEpew7r.	2026-05-06 10:56:08
josnel.blanco@gmail.com	$2y$12$TzXm.w0ih3PVz3JKJUPG6OKqWuQC1IN3gGCJMEaf.Ll.w6QDGAYLa	2026-05-06 10:56:43
0victor.rojas@gmail.com	$2y$12$oWk3K9Aw2/AtT6l1sk/BrON/bTFQ9kpffCbMW2jegPn4KoSuuk/2.	2026-05-06 10:57:07
\.


--
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
6	App\\Models\\User	3	pos-v1	4ea5ada045cb1466b4bfac7674cbc28bbdf8a4aedeceb1a73e4a76866312dfba	["*"]	2026-05-06 02:51:17	\N	2026-05-06 02:51:11	2026-05-06 02:51:17
1	App\\Models\\User	1	pos-v1	a4a71c2dd4d224306b9a42260ab0557cce649f833907df753a427dd5c77ba210	["*"]	2026-05-05 02:54:23	\N	2026-05-05 02:54:02	2026-05-05 02:54:23
40	App\\Models\\User	8	pos-v1	ce5a9a756c6e3a2e4c6a11772f148388f0971c6d7d6a70dd269b54dfe3144a94	["*"]	2026-05-13 19:12:02	\N	2026-05-13 19:08:10	2026-05-13 19:12:02
26	App\\Models\\User	3	pos-v1	dc4396e5b899fd10dadbaf4e9ec96ce78085c17a2618f19fd57636fed1688889	["*"]	2026-05-12 17:19:21	\N	2026-05-12 12:21:10	2026-05-12 17:19:21
28	App\\Models\\User	8	pos-v1	38074a97df5e5daeea773f2879d3a247dbf9b2e984cc821a225f841a74524e84	["*"]	2026-05-12 21:23:43	\N	2026-05-12 15:04:37	2026-05-12 21:23:43
7	App\\Models\\User	3	pos-v1	0037d36404fe1e9745112585fbaf60b07f9e5f5cb162f24275ab4abbe04f209c	["*"]	2026-05-06 10:58:30	\N	2026-05-06 10:57:32	2026-05-06 10:58:30
10	App\\Models\\User	7	pos-v1	a250c5bf4ad9c04c1cb09740b15a6fd056b80cd330062cff11fcb717900f6086	["*"]	2026-05-07 03:04:58	\N	2026-05-07 02:15:13	2026-05-07 03:04:58
23	App\\Models\\User	3	pos-v1	2a781af1b1afb530f60d10e86466152870b47f30304a23991c1b5efe1ae64150	["*"]	2026-05-12 03:02:26	\N	2026-05-12 02:48:05	2026-05-12 03:02:26
3	App\\Models\\User	1	pos-v1	10498defe16f68a517a2e8d0a777a80cd067e60ee782f0e279430313ac0332e9	["*"]	2026-05-05 03:37:23	\N	2026-05-05 03:31:47	2026-05-05 03:37:23
11	App\\Models\\User	7	pos-v1	4fbcc421591c217b538c8252260964f1d1d17f92da10801a59a1b8ddc2494c61	["*"]	2026-05-12 03:28:20	\N	2026-05-07 03:05:19	2026-05-12 03:28:20
19	App\\Models\\User	8	pos-v1	e1c6e1a17af477f454694e4116e390e62f9f5f50f2325f267fa5c1189afb9811	["*"]	2026-05-09 13:46:47	\N	2026-05-08 20:10:03	2026-05-09 13:46:47
2	App\\Models\\User	1	pos-v1	168025808f077e8e2c8066f560107ee4b261e7318de7620d6d9cbe06f9e2aa6e	["*"]	2026-05-05 14:26:24	\N	2026-05-05 03:30:05	2026-05-05 14:26:24
29	App\\Models\\User	8	pos-v1	e451c0868422746e744d239ee2a3244ac05e588778de3735f1d8f9b18d589391	["*"]	2026-05-13 04:03:11	\N	2026-05-12 21:23:56	2026-05-13 04:03:11
12	App\\Models\\User	8	pos-v1	4f1a026acb629ef06bdc9ffc2bdb1dfd0976dac35c906689c3353971aac376f8	["*"]	2026-05-07 12:32:34	\N	2026-05-07 12:30:25	2026-05-07 12:32:34
22	App\\Models\\User	8	pos-v1	212c0970b121180efaf97a63c0421463daf4158d2a8c626a69cbf94b7708961b	["*"]	2026-05-10 21:02:24	\N	2026-05-10 13:28:01	2026-05-10 21:02:24
13	App\\Models\\User	8	pos-v1	8029bad7c126810d14e5932de61379f95287a9183edc0ada9cff8df12679e919	["*"]	2026-05-07 16:58:08	\N	2026-05-07 12:32:47	2026-05-07 16:58:08
14	App\\Models\\User	8	pos-v1	9eb7f396b02a756a585e64431ac26e1addbedc1e66619c20a4f2e5d950a17bdc	["*"]	2026-05-07 18:36:30	\N	2026-05-07 16:58:40	2026-05-07 18:36:30
8	App\\Models\\User	3	pos-v1	cc9a5cbfd967ca91dd1a93d2a22a1aedcfd3509fa113f1f7afbbffd0e155d3ca	["*"]	2026-05-07 01:37:36	\N	2026-05-06 11:07:09	2026-05-07 01:37:36
4	App\\Models\\User	3	pos-v1	b0b2c387f8b1a1f8265323c494fa03d0e527cf93bc83c2116ea47bf585c9e842	["*"]	2026-05-06 02:47:05	\N	2026-05-06 02:28:03	2026-05-06 02:47:05
39	App\\Models\\User	8	pos-v1	4c4b84438d47bdbc7cb3ee68fe936ea773a7d1999905fa69530c2f0515fd4122	["*"]	2026-05-13 19:07:49	\N	2026-05-13 19:05:01	2026-05-13 19:07:49
15	App\\Models\\User	8	pos-v1	59524301506a850d902f2e89f9f6f6bcb170ebea3b8e780b4c78d32861decd95	["*"]	2026-05-07 18:42:24	\N	2026-05-07 18:37:17	2026-05-07 18:42:24
5	App\\Models\\User	3	pos-v1	f9df70616b4098a6e1510cb435e0789ce91541738f2cff3af23c69ef48b362e8	["*"]	2026-05-06 02:50:50	\N	2026-05-06 02:47:18	2026-05-06 02:50:50
9	App\\Models\\User	3	pos-v1	9193651af1e6dbb6608846939e9ca12bd631751cbe2cc7c9586c2560615da71e	["*"]	2026-05-07 02:14:59	\N	2026-05-07 01:37:58	2026-05-07 02:14:59
18	App\\Models\\User	8	pos-v1	e517eae0ec451e9266025302e125798356766dec9f494bebee77f05c656d9ba2	["*"]	2026-05-08 20:05:43	\N	2026-05-08 18:09:31	2026-05-08 20:05:43
16	App\\Models\\User	8	pos-v1	4ebe8e8df2bc5c10ef238171a89c06b24f0f3f7c9ee0077a6515f8a42392f938	["*"]	2026-05-08 01:02:26	\N	2026-05-07 18:43:01	2026-05-08 01:02:26
24	App\\Models\\User	3	pos-v1	739bf79a49d75e0eed15ae92c47a7ab4adf8d4204e26603257f83b09db77e369	["*"]	2026-05-13 02:30:00	\N	2026-05-12 03:44:11	2026-05-13 02:30:00
20	App\\Models\\User	8	pos-v1	a16b0b141e9fd9750201ecf8d2a07a163591c474108e5ff1a777c02a9b7eb039	["*"]	2026-05-10 03:01:35	\N	2026-05-09 13:46:59	2026-05-10 03:01:35
25	App\\Models\\User	3	pos-v1	fd080a3979be68de7da81e8eab3a2019324a374091e2da1977c8828bb048430d	["*"]	2026-05-12 12:20:35	\N	2026-05-12 03:44:48	2026-05-12 12:20:35
17	App\\Models\\User	8	pos-v1	32d9f360542e898b3073694f11ee68c46b33239ce5d2b73580d5972400286d2a	["*"]	2026-05-08 02:01:30	\N	2026-05-08 01:02:39	2026-05-08 02:01:30
21	App\\Models\\User	8	pos-v1	5b0a35f66df6e64d77dd31b87cbb56dd99e5ae2f3a5b2e9089ebff61a3648f60	["*"]	2026-05-10 13:27:47	\N	2026-05-10 03:01:48	2026-05-10 13:27:47
36	App\\Models\\User	3	pos-v1	4ef86933c4a4c70f6beea47b337a6140279d290f46c1b7b61c10529a73f0aa19	["*"]	2026-05-13 04:08:11	\N	2026-05-13 03:59:54	2026-05-13 04:08:11
31	App\\Models\\User	3	pos-v1	272e24fea2eb88f94f73d529d35ee7cddd4c88b1069b27ac14397f007d1fc0b7	["*"]	2026-05-13 03:32:35	\N	2026-05-13 02:30:22	2026-05-13 03:32:35
32	App\\Models\\User	3	pos-v1	c0f29bc4012d546e8a94f2403b155e9faada03cb04870894457cbc6191112f1c	["*"]	2026-05-13 03:32:39	\N	2026-05-13 02:30:47	2026-05-13 03:32:39
27	App\\Models\\User	8	pos-v1	7468dc55f707f99429f53642a92a6456cefae4a9091cadd3505071e1a5a23be7	["*"]	2026-05-12 15:04:11	\N	2026-05-12 14:51:03	2026-05-12 15:04:11
30	App\\Models\\User	3	pos-v1	0aaece14c50b399c3793ae4740bcf5244f49c6ebaa3304d306d72bebe926f507	["*"]	2026-05-13 02:30:30	\N	2026-05-13 02:25:25	2026-05-13 02:30:30
34	App\\Models\\User	3	pos-v1	3dfa9b016eae27f7374df5abd04271afcb5ff2b02c1eb2b2132fc620a02c7c16	["*"]	2026-05-13 03:58:51	\N	2026-05-13 03:33:19	2026-05-13 03:58:51
35	App\\Models\\User	3	pos-v1	65d5e1b3729b349c2cfcc5ed8e1805a07c0f9777846d2678f24ec2eee6e41d02	["*"]	2026-05-13 03:59:30	\N	2026-05-13 03:51:35	2026-05-13 03:59:30
37	App\\Models\\User	3	pos-v1	c538cfe5f42f7f109f2af8c6f018dfea8a78b2ecc6de928c3625e108c3b113b5	["*"]	2026-05-14 13:59:24	\N	2026-05-13 14:00:25	2026-05-14 13:59:24
33	App\\Models\\User	3	pos-v1	ddf1b478de9aa4ac5d766f66d4effcc24cea394a1a6b169816ec2c5cee98ac19	["*"]	2026-05-13 16:38:27	\N	2026-05-13 03:32:54	2026-05-13 16:38:27
42	App\\Models\\User	8	pos-v1	15a26b5adcfbc1be68222d5ed27c7c08a8436221d64bae43e94dd144d33bed51	["*"]	2026-05-15 00:41:46	\N	2026-05-15 00:31:37	2026-05-15 00:41:46
41	App\\Models\\User	8	pos-v1	d718fa7f5c4a4c3fe1b08dc33325f46a77dd90cdcb0754374b13ad189c3743ce	["*"]	2026-05-15 00:31:22	\N	2026-05-13 19:17:27	2026-05-15 00:31:22
38	App\\Models\\User	3	pos-v1	7b64144ef4c938fe63c4e86578248726bdae0bd64a34cdd814a5d8daf6d55f2c	["*"]	2026-05-15 03:14:05	\N	2026-05-13 16:39:04	2026-05-15 03:14:05
\.


--
-- Data for Name: processed_sync_events; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.processed_sync_events (event_id, tenant_id, entity_type, action, entity_id, occurred_at, processed_at, status, error_message) FROM stdin;
62a6742b-a493-475e-9d21-a9b2832f5489	38a95beb-e41e-4949-8224-caf230a9cf2c	ITEM	CREATE	be04afad-e139-4449-9ae0-d9b56b7bc629	2026-05-07 02:16:41	2026-05-07 03:04:32	OK	\N
6fb15e02-c1bf-413e-ba0c-9fb4e94fc8cb	38a95beb-e41e-4949-8224-caf230a9cf2c	ITEM	CREATE	f6eac89d-06ab-41f2-abf5-ba2e77c95aee	2026-05-07 02:17:19	2026-05-07 03:04:32	OK	\N
55fc0f33-9a1c-4c5d-82a6-32c31fdf40a7	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	f7b53e0b-f613-4204-a93b-ac4428c9c2e8	2026-05-07 18:38:56	2026-05-07 18:39:04	OK	\N
5016c929-5079-43f3-b10d-dbf2f9e107e6	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	37fec907-3e79-4b7e-ac51-5b58439899b4	2026-05-08 01:04:19	2026-05-08 01:35:55	OK	\N
2e9c6efa-23e5-4be3-8be1-60138b5f2480	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	88f5e57c-8d7d-4d84-b9c5-d51d5ad431cd	2026-05-08 01:05:32	2026-05-08 01:35:55	OK	\N
063f22a7-82d0-4b18-a690-f0af14a46f1a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	a42f3953-5b96-417a-ad80-6d9ca9929e7f	2026-05-08 01:07:18	2026-05-08 01:35:55	OK	\N
98f92056-e266-4329-bac3-bf6cb9bfb480	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	72755900-d2ef-4c08-942b-9d240f7f01cc	2026-05-08 01:08:29	2026-05-08 01:35:55	OK	\N
7c624766-22c7-44dc-9fb1-8510f50b5aa9	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	d0b06411-91a3-4678-b0d1-69db8364e910	2026-05-08 01:09:41	2026-05-08 01:35:55	OK	\N
746f28c1-e32c-4c08-a856-b8619a799533	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	51ce7aa4-b452-4f1a-9d5f-71a5741d2d14	2026-05-08 01:10:38	2026-05-08 01:35:55	OK	\N
4e1cca5e-8ad0-4a70-b0b1-d385c675b4a2	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	a2f188fc-6e3d-4924-81f7-4885e8154131	2026-05-08 01:11:48	2026-05-08 01:35:55	OK	\N
db006ee3-86af-46e0-b90a-9a24ab47ceeb	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	996ba442-f430-4541-ac79-542c5e1759a1	2026-05-08 01:14:20	2026-05-08 01:35:55	OK	\N
6a7d27c7-a3f4-4606-bc24-cc56508dd887	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	dffd1a90-524b-4892-9fd5-cec350e0f809	2026-05-08 01:16:15	2026-05-08 01:35:55	OK	\N
395eff0e-5263-47a7-bb48-12abae22ecd0	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	4e39ee5b-30ad-4847-b888-63043dd9497f	2026-05-08 01:17:27	2026-05-08 01:35:55	OK	\N
b4955ebe-c44c-43b2-9a51-a0bc70062de1	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	e21bf798-09a3-4b06-bc0d-122e28a8dbef	2026-05-08 01:18:27	2026-05-08 01:35:55	OK	\N
b132f9ee-20ff-4bab-97c3-7d5419f6ab34	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	36df995c-b75a-4a8f-b241-f05e5d5c3e4d	2026-05-08 01:19:51	2026-05-08 01:35:55	OK	\N
c8723066-6349-4284-b6b8-1b62991d08cf	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	5af7a850-cd28-4fa2-aa01-c584556246b5	2026-05-08 01:24:41	2026-05-08 01:35:55	OK	\N
4e1c388c-7a24-4e3c-98ce-1042ec4eaf45	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	bbb06361-d4e0-49a1-b94d-5576aba257d4	2026-05-08 01:25:54	2026-05-08 01:35:55	OK	\N
44f4e490-267e-400e-a6a2-439c17cf58a9	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	0635f7f0-14b0-4e84-9c4f-6b0f2ad733c8	2026-05-08 01:29:21	2026-05-08 01:35:55	OK	\N
241b5cc5-4464-4386-82e0-cf6bcaa218d6	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	UPDATE	4e39ee5b-30ad-4847-b888-63043dd9497f	2026-05-08 18:33:45	2026-05-08 18:33:57	OK	\N
a07253a1-b191-47f3-b9d2-5dcb6720a7de	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	4e39ee5b-30ad-4847-b888-63043dd9497f	2026-05-08 19:04:55	2026-05-08 19:21:54	OK	\N
7cf8f089-9ddb-492e-92fa-a849ca8b3101	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	88f5e57c-8d7d-4d84-b9c5-d51d5ad431cd	2026-05-08 19:04:57	2026-05-08 19:21:54	OK	\N
8b3668cd-a3da-47db-8af4-903190251b57	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	996ba442-f430-4541-ac79-542c5e1759a1	2026-05-08 19:06:22	2026-05-08 19:21:54	OK	\N
29bc2887-0fb9-4e7f-bbea-cb8cc8b96a3e	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	a2f188fc-6e3d-4924-81f7-4885e8154131	2026-05-08 19:07:25	2026-05-08 19:21:54	OK	\N
b1de1f37-4479-4ae9-97b1-91800304be7b	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	51ce7aa4-b452-4f1a-9d5f-71a5741d2d14	2026-05-08 19:08:44	2026-05-08 19:21:54	OK	\N
fd78fb63-62d7-40ae-af15-14caaab213ec	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	bbb06361-d4e0-49a1-b94d-5576aba257d4	2026-05-08 19:10:09	2026-05-08 19:21:54	OK	\N
f250f52c-e721-4ba0-91b1-58b177934e77	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	0635f7f0-14b0-4e84-9c4f-6b0f2ad733c8	2026-05-08 19:12:29	2026-05-08 19:21:54	OK	\N
576c999d-6124-4976-b4cd-04947febfce2	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	dffd1a90-524b-4892-9fd5-cec350e0f809	2026-05-08 19:13:21	2026-05-08 19:21:54	OK	\N
05af9da7-1bf6-4bc6-9fa9-eac2a21707ce	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	36df995c-b75a-4a8f-b241-f05e5d5c3e4d	2026-05-08 19:14:01	2026-05-08 19:21:54	OK	\N
88158b0f-2d88-4302-9210-d498ff9ce4fa	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	37fec907-3e79-4b7e-ac51-5b58439899b4	2026-05-08 19:14:53	2026-05-08 19:21:54	OK	\N
a452b709-ec9d-49d3-81ba-092ac685646a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	a42f3953-5b96-417a-ad80-6d9ca9929e7f	2026-05-08 19:16:48	2026-05-08 19:21:54	OK	\N
19f5094d-7678-4ecd-88a2-566bdad18597	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	f7b53e0b-f613-4204-a93b-ac4428c9c2e8	2026-05-08 19:17:46	2026-05-08 19:21:54	OK	\N
bed92ece-8f59-486f-9005-1bc8daaf943e	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	e21bf798-09a3-4b06-bc0d-122e28a8dbef	2026-05-08 19:18:38	2026-05-08 19:21:54	OK	\N
6b2ae89d-1e51-4a3d-bcd7-7a32a6216f78	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	72755900-d2ef-4c08-942b-9d240f7f01cc	2026-05-08 19:19:19	2026-05-08 19:21:54	OK	\N
a74ef1ed-6240-4ce9-8bc8-5f0905461e93	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	d0b06411-91a3-4678-b0d1-69db8364e910	2026-05-08 19:20:06	2026-05-08 19:21:54	OK	\N
a809dae5-cbc9-416a-8779-268fca79f4c7	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	5af7a850-cd28-4fa2-aa01-c584556246b5	2026-05-08 19:21:51	2026-05-08 19:21:54	OK	\N
77b3e68d-7dd6-4818-adfd-ce9a7a05bb68	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	05f6dcf5-dcfa-4cea-948b-3583da2ed2e7	2026-05-08 19:23:35	2026-05-08 19:23:37	OK	\N
d2a82c24-b203-4514-9806-3a0924b1c5a8	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	f28eef60-21d9-4f27-b538-34195b71e770	2026-05-08 19:26:59	2026-05-08 19:48:10	OK	\N
98e468c8-3dd6-4398-88d7-91c9dea4203c	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	0e75eabd-9f2c-4f7b-b73f-65a6fb0fcb8a	2026-05-08 19:28:18	2026-05-08 19:48:10	OK	\N
b615beea-4d61-4fe9-90f2-d28d70897b96	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	5da610e1-d2ab-4a6e-ac47-f5b882a744d1	2026-05-08 19:29:33	2026-05-08 19:48:10	OK	\N
3f1d999d-206a-4764-9bbb-26497afaf596	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	00c246d2-baa3-4dd3-9197-abe105774a5d	2026-05-08 19:30:12	2026-05-08 19:48:10	OK	\N
b351b16a-9fc5-4ddc-88c0-ff6b9b0f3e77	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	f0583a36-8dd1-4413-8c5b-52e4e12d001c	2026-05-08 19:30:48	2026-05-08 19:48:10	OK	\N
67a11ada-ce1d-409b-9c26-1da9534b7892	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	019c35f2-7ad7-4ecc-b966-bb7f414172a0	2026-05-08 19:33:29	2026-05-08 19:48:10	OK	\N
a6f300b9-946b-4add-b880-286c04c6e64b	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	60b0e283-1621-47f8-858f-e7e6203e7f06	2026-05-08 19:35:00	2026-05-08 19:48:10	OK	\N
f8c92121-d58e-449e-af4b-c349b960c17a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	0a8bbdaf-ab60-4f70-b087-657d57d91a30	2026-05-08 19:39:04	2026-05-08 19:48:10	OK	\N
93e49fbe-228a-4fd5-a86a-369117875adc	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	f124458d-a15a-4a71-93b6-b080217ed414	2026-05-08 19:42:31	2026-05-08 19:48:10	OK	\N
00b18b87-bd49-445d-aa40-0d2f85029d85	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	53eb908c-c89e-4527-91f4-0c0e150e0961	2026-05-08 19:45:01	2026-05-08 19:48:10	OK	\N
940d0d8d-7a72-42e4-bf49-ff6af9e5a70d	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	63bbf672-2bf2-4f21-80e2-0214471326be	2026-05-08 19:48:04	2026-05-08 19:48:10	OK	\N
3ea08fa4-6f61-4cf0-bb34-1e3406e9b5cb	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	6f0c00c2-37f7-4d5e-9a46-ae7ebc00fc03	2026-05-08 19:58:32	2026-05-08 19:58:44	OK	\N
8c458d3d-54d2-45ab-8d0b-a62d54411696	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	d998fee9-49fa-433f-986c-94633e672e4b	2026-05-09 13:48:25	2026-05-09 13:50:10	OK	\N
956bb590-948b-4738-9914-a39b8673580b	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	1c77d9f7-939b-489b-b821-9126749b5765	2026-05-09 13:49:02	2026-05-09 13:50:10	OK	\N
1bd3d1ba-ff27-4903-8fcd-93827fe75432	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	d7f980d2-2355-41dd-b80d-f99e11f69539	2026-05-09 13:49:38	2026-05-09 13:50:10	OK	\N
ff779b53-0c73-4c4d-b1ab-2b762a9c5a1f	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	b96b84de-5f19-4df8-b663-4d97fc04b4d3	2026-05-10 03:02:48	2026-05-10 03:03:31	OK	\N
b90f25a0-670b-4313-abf1-642ebb8418e7	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	b3b42c8f-8a72-4c49-afdd-af14cd84321d	2026-05-10 13:53:04	2026-05-10 13:53:13	OK	\N
651c44a5-3169-46b4-b30f-7ab45c269d92	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	CREATE	9811cc75-e50d-4380-b033-448a0d139fa2	2026-05-12 02:55:57	2026-05-12 02:55:59	OK	\N
288ede4e-b5da-496e-ab8e-9c0211164bd8	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	CREATE	c79c95b4-e0e3-4317-9742-117453cd9b16	2026-05-12 15:23:33	2026-05-12 15:27:00	OK	\N
a62aa945-aa0d-40e0-b349-d1679a84e0e2	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	UPDATE	c79c95b4-e0e3-4317-9742-117453cd9b16	2026-05-12 15:23:54	2026-05-12 15:27:00	OK	\N
5ad9d807-789a-4309-90f1-fc47eed29112	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	CREATE	4312f8f4-c94c-440b-aa41-3f9733f851e5	2026-05-13 02:33:27	2026-05-13 02:34:24	OK	\N
4aeb912f-edcd-4745-bc56-54db512a7b52	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	UPDATE	4312f8f4-c94c-440b-aa41-3f9733f851e5	2026-05-13 02:33:53	2026-05-13 02:34:24	OK	\N
937470bc-0099-43c6-aa88-5d64933d77d4	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	UPDATE	4312f8f4-c94c-440b-aa41-3f9733f851e5	2026-05-13 03:04:52	2026-05-13 03:32:35	OK	\N
d352d528-9ce4-4843-9cc4-036cef4eb37e	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	DELETE	4312f8f4-c94c-440b-aa41-3f9733f851e5	2026-05-13 03:33:24	2026-05-13 03:34:23	OK	\N
ff98906f-a34c-414e-bab4-23b1572373eb	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	CREATE	b2d0619b-6229-4616-805a-d412a255c293	2026-05-13 03:33:46	2026-05-13 03:34:23	OK	\N
799507fe-5852-4326-b681-891f2bd21de9	7bbb66d9-0762-47a5-a8f1-6f947427af1e	ITEM	UPDATE	b2d0619b-6229-4616-805a-d412a255c293	2026-05-13 03:33:56	2026-05-13 03:34:23	OK	\N
8fb5b265-181d-49d2-91cd-efd1368308ce	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	05f6dcf5-dcfa-4cea-948b-3583da2ed2e7	2026-05-13 19:07:06	2026-05-13 19:07:28	OK	\N
2fceda73-205f-4474-b46d-e9c1245c63ca	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	f28eef60-21d9-4f27-b538-34195b71e770	2026-05-13 19:07:07	2026-05-13 19:07:28	OK	\N
dda18ea8-2d88-4cd2-84ec-ffc92df23b6c	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	0e75eabd-9f2c-4f7b-b73f-65a6fb0fcb8a	2026-05-13 19:07:09	2026-05-13 19:07:29	OK	\N
41fc794d-7847-4a44-92db-9e01e29f01f2	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	5da610e1-d2ab-4a6e-ac47-f5b882a744d1	2026-05-13 19:07:10	2026-05-13 19:07:29	OK	\N
7c15634d-452a-4371-bf8a-e9ba140577a7	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	00c246d2-baa3-4dd3-9197-abe105774a5d	2026-05-13 19:07:11	2026-05-13 19:07:29	OK	\N
8fa4602a-a97c-4d22-8b41-c9923caf50c3	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	019c35f2-7ad7-4ecc-b966-bb7f414172a0	2026-05-13 19:07:12	2026-05-13 19:07:29	OK	\N
30d6d3b8-1f35-49ac-aaf9-e4521fb9dde8	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	f0583a36-8dd1-4413-8c5b-52e4e12d001c	2026-05-13 19:07:13	2026-05-13 19:07:29	OK	\N
2a9eaf67-df86-4e7f-b25e-632d4f8984d8	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	d998fee9-49fa-433f-986c-94633e672e4b	2026-05-13 19:07:14	2026-05-13 19:07:29	OK	\N
f4d5fd2e-d7ac-45e5-81b6-31180f634a8d	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	60b0e283-1621-47f8-858f-e7e6203e7f06	2026-05-13 19:07:15	2026-05-13 19:07:29	OK	\N
5b3ad5e9-7a98-44e4-b36b-0046727b54bc	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	1c77d9f7-939b-489b-b821-9126749b5765	2026-05-13 19:07:16	2026-05-13 19:07:29	OK	\N
0a23f25d-e7dc-4f52-950f-26b189b527d5	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	0a8bbdaf-ab60-4f70-b087-657d57d91a30	2026-05-13 19:07:17	2026-05-13 19:07:29	OK	\N
f24ff681-9632-43f2-9371-beb0fd529d85	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	d7f980d2-2355-41dd-b80d-f99e11f69539	2026-05-13 19:07:18	2026-05-13 19:07:29	OK	\N
bb16a511-8550-4e3e-90d6-169069330bf0	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	f124458d-a15a-4a71-93b6-b080217ed414	2026-05-13 19:07:19	2026-05-13 19:07:29	OK	\N
da9f986c-21b2-4742-82c6-45246533adf9	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	63bbf672-2bf2-4f21-80e2-0214471326be	2026-05-13 19:07:20	2026-05-13 19:07:29	OK	\N
29e380bf-2c3d-495c-bfe9-db921f2e6525	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	b3b42c8f-8a72-4c49-afdd-af14cd84321d	2026-05-13 19:07:21	2026-05-13 19:07:29	OK	\N
d849aad1-136e-428f-92d8-8ea41e3b4b8b	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	6f0c00c2-37f7-4d5e-9a46-ae7ebc00fc03	2026-05-13 19:07:22	2026-05-13 19:07:29	OK	\N
75b04a22-c2f6-4435-9633-1ee32ed162cf	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	b96b84de-5f19-4df8-b663-4d97fc04b4d3	2026-05-13 19:07:24	2026-05-13 19:07:29	OK	\N
2063029b-fdc0-489f-9e5f-4cc64372175a	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	DELETE	53eb908c-c89e-4527-91f4-0c0e150e0961	2026-05-13 19:07:25	2026-05-13 19:07:29	OK	\N
b15f6d71-205b-45b2-9d89-26db75a6a960	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	850176ca-cc2e-479f-9b6f-3cc93c9a80ae	2026-05-13 19:18:32	2026-05-13 19:18:37	OK	\N
1f690ad3-a55e-4401-97c7-ddb83f2d0e8e	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	8c7bfc53-dce6-43e3-bcc1-b2ef93ff441a	2026-05-14 22:59:50	2026-05-14 23:22:14	OK	\N
825bbbbe-74e0-421a-827d-36e32d04228f	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	696a7985-3909-48dc-8139-f1ef0e1f219a	2026-05-14 23:12:24	2026-05-14 23:22:14	OK	\N
dbd3173e-2077-4008-a04d-d509d8c42c45	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	135c70cc-1db5-4cdb-8fa0-c0d2adecac2b	2026-05-14 23:14:28	2026-05-14 23:22:14	OK	\N
4878e0e3-aeb0-4b9e-96d0-752aa4116dc4	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	2324e0f2-76c2-4e0e-b504-65495a55078a	2026-05-14 23:15:09	2026-05-14 23:22:14	OK	\N
57174510-a5e2-4b12-94b1-cf634e8d18b9	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	95bb0e9b-ccbf-420a-9c35-82572bd82a41	2026-05-14 23:17:48	2026-05-14 23:22:14	OK	\N
d105d4f3-d2f0-44fc-a09d-becdbe243154	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	623157c0-c6e6-4512-9df0-cd59678962ac	2026-05-14 23:18:31	2026-05-14 23:22:14	OK	\N
12da2d50-dfcc-4c8b-9f55-8273ec4af86f	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	3cae7133-253c-4427-b209-267f28c94683	2026-05-14 23:19:08	2026-05-14 23:22:14	OK	\N
efccee7d-58fd-49cf-aa41-f5bb64b3ae1e	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	ITEM	CREATE	6d2ceb6d-453d-428b-a579-83be753ad0d3	2026-05-14 23:21:08	2026-05-14 23:22:14	OK	\N
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.sale_items (id, tenant_id, sale_id, item_id, line, description, serial_number, quantity_purchased, item_cost_price, item_unit_price, discount_percent, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sale_payments; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.sale_payments (id, tenant_id, sale_id, amount, payment_method, reference, note, paid_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.sales (id, tenant_id, invoice_number, comment, sale_time, terminal_id, customer_id, employee_id, payment_method, status, subtotal, tax_percent, tax_amount, total, paid_amount, amount_received, change_amount, reference, due_date, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
Vsrx7EFJiUgrDRy8fqAd7UWm1Jhgd9qYxhpEwQFe	\N	10.0.1.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15	eyJfdG9rZW4iOiJZTGxzWmhpQ1k0N3huVWlESmd1aUU4WHhoUlJ4UVVYbzQzeVQwVU5OIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778116197
RT6TIV8UDDW8KWE21GFpfFOJ49qL3Q7ImluHQiYg	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36	eyJfdG9rZW4iOiJ6bUFlTkQ2UlJvcDAzRXlTSUw0SnZGbktkNUpibHVoall3MGl6OFpsIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778128879
DlFm1oDuiM4WtDOhEBCZYvbAHMmmaQvU3w10G7dv	\N	10.0.1.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJOYUJzYlVnYXlUNHVwblpQZmM0RmZ6RkJubFZHazFaSXhDVjIyaWE2IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778147171
K5BO7G4d6Dtge5cAOyanXQatpbDPGgk603MDZSMZ	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJYeFlVYWpIVmVTa1hmb1gyTVhweHF2ZEZ5NUY0OVpnakhRQWdEaGQ2IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778159359
0e3whhysMIa2xIx9l3jZKyn8Y8xTyFNa4Vd5UD0B	\N	10.0.1.4	Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.3; +https://openai.com/gptbot)	eyJfdG9rZW4iOiI5ekVWczh2TnNEWnI0SDNGV2hBbkZ4TWs4Rzh5WXZtNVprekZGaWV4IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778161057
WpD7hFC3neInEnu0pjdS9VAN5NrmahXKO0PXSHXz	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3	eyJfdG9rZW4iOiJFbElNcFhnY29GNzFkNFQ0M0w1YnAzZEY0RDlWTGJZNkw1VjlLMUZwIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778231495
F7wLWPU9PBMiUNB6i3zvSOe9xgUf4UGDIv3LwBGE	\N	10.0.1.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJ4ZmtPMVJIc2NTYnpwUHV5SVNOZ2c1ODByMEhZY2EyT3Fka1JwbmdDIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778306019
9XjCFFdGOlK3KKZIFlJHFoi8tfaaDDx0ogEUtCDN	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0	eyJfdG9rZW4iOiIyaUpnbmxZdnA0VExLTWc0TFp0aWVjOE54NVVkemxoNDBGYnU1ZGZQIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778332739
cDgQ9gLXZGZTcPajOzwZt7V1dxaC8v3AiJc7QvTD	\N	10.0.1.4	Mozilla/5.0 (iPad; CPU OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53	eyJfdG9rZW4iOiJqdExEOTFlZjlNYVhFWXJKVklnSzVVMXFLVFpZWWJtSlk3Y09xUVY3IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778359139
kWGd9cSgj7kbHeoTL2KZ80f5AgMoywCdHRXPYhl9	\N	10.0.1.4	RecordedFuture Global Inventory Crawler	eyJfdG9rZW4iOiJpQ0tUQTJSSzNTdThyUm1oSmJmcjAxWTZNelN3MnlpeFpzTzFHaktCIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778397494
95Z3i9xsr1PWv9TCvqTpcsZ2DJBPVFkLAX52zWAn	\N	10.0.1.4	Mozilla/5.0 (compatible; CMS-Checker/1.0; +https://example.com)	eyJfdG9rZW4iOiJ3dTBpTDFuMElJOFBXYldETTF3aDVZUzh0NEw1blZHOGFrYm1nTDNiIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778424755
lHZlC59viAZJqA4afMa1KpqfVTi6ohEX5gXbDpsJ	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0	eyJfdG9rZW4iOiJVZDNQdTlrWVAzQkRZaXRKUWtKN244bWtmckNWQktsR3hJb0Zxb2dyIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778438203
OKFkFZv0pQMKhxRV6L2wdg9SZu7MsiUk1wxCYUyt	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJKdDhWbnUyUkZ4bHFQMDJOVVdkSnVQNjhubVJnRlJTQW1ydkdFZGg5IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778504229
axGsMceFOsV1RLmWrsYzP0sI6UaY0EauEFw2RCKp	\N	10.0.1.4	Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36	eyJfdG9rZW4iOiJ0dW5kVHdndDFyeUQ5bmwyeXhiSUFBNXRPcm9tUTRRZG95NWRwRVBBIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778549307
l5G1f9DQo3U8XXYLVucBi9Q4FCOWcKypZqRUIlsD	\N	10.0.1.5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJKYnJCc1BkdU0wMGdSSjNScEYxNHFFR1VGWklQd2RzZzk2M2UzOUtZIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778592670
sDC7sK7KkqAIz7zudYLW9ceLR5A2YbbFRG36TZVi	\N	10.0.1.5	Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; Touch; ASU2JS; rv:11.0) like Gecko	eyJfdG9rZW4iOiI2MG1RRlJyYXFYaFNQWm9XNmhISnBJMFREZzBFNkxYVE1rS0c2TEhVIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778674376
oz5weGqsppqOz3swyIHVfIbCins14yVDlwl2ppKw	\N	10.0.1.10	Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/120.0	eyJfdG9rZW4iOiJVNU53cFJLbjZ0ZVRIcWxHYXFGbVowTzZhcDBXbGNCc1lkaDFvSWVpIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778817956
MVG1EqGFzbVDfHsM0AFdoFdwYEbj6DYjzbGuGhp1	\N	10.0.1.10	Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/120.0	eyJfdG9rZW4iOiJLUWFsUlNiUVR6d2JqZmR1RGNsOE9GQXlrc21YTkIxb2ZHZ1B2UG5rIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778832138
YMRaNZmOAUeMPioC29TjNKlcnuuNQ7VJSis4OaD0	\N	10.0.1.4	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36	eyJfdG9rZW4iOiJob3hQNWxWZGtZMmxxbUFPZkFqbGo2am1QbGJyeTBtQmt2bTk0V3hxIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778124261
WQHgtedDFUfOzBrmI1JpnDmAtUtRN0FTGC4jDjwb	\N	10.0.1.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJwVWlzZkx6T1lTTEY5NkhBUzdZbE4yTU9pYzI4dloxQlczY3NQNEZPIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778133140
HlA7My7TbBs0jOwmhlB53rroCyc5TXDC44Fdu7aQ	\N	10.0.1.4	Mozilla/5.0 (X11; Linux i686; rv:124.0) Gecko/20100101 Firefox/124.0	eyJfdG9rZW4iOiJEa0RTaGVPTkp1WFp5TmlETEJKWkFMdkpRRHNlNHdWamFuRmtPUFBFIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778149367
RyddJsiA0OBlqMeI2ySm9hroPOEj2nkXpyxbrsBE	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	eyJfdG9rZW4iOiIzT2o2QUVuZ0piT0x1QU1hUVJHTDBMUFEwSEtsT2J6M2s4MGl5eFA1IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778504638
3SFjiBGlkUXQeIwxvJLb6MdHSwpfsCwo7W4x6GH5	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36	eyJfdG9rZW4iOiI4YjgzRkF6cVFiUGZWOE1JN05oR0dOZEx1V2FNdTNhQXRrbVk1QWhXIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778549312
FKHzkDHwxaRRIcm2mFjuf9TM0d6Mo6DtbPZ5DyF5	\N	10.0.1.5	Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)	eyJfdG9rZW4iOiJwUEgyQnBsMkVLa1J0bExJTnpXQjhidldrMzE4YWxJdnZuc01EbVg1IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778602680
XEy2sw3AuE4lAOkY19D2Ew0Rbp6EeCViWxgfTPbM	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJqNkpqZkZrWHdPREw4SHRMa0R4RWx1WFRCT3VEbUppNHBaUjBnZzhBIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbVwvP3JldHVybj1odHRwJTNBJTJGJTJGMTY5LjI1NC4xNjkuMjU0JTJGbGF0ZXN0JTJGbWV0YS1kYXRhJTJGaWFtJTJGc2VjdXJpdHktY3JlZGVudGlhbHMlMkYiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=	1778159436
qv2SYKabEBInF0TMrtH6kINDuijLfYuLgjbxvp0m	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJQY2dHRWNiZ1VrbFQ1bmhoRU5PY1h4WjYyME5yckhhcUFRTThlT3BzIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778163893
NlM5fNP7e8L4bsrE6uqQmF3wePpxNZdXJ4IfA0JG	\N	10.0.1.4	Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.3; +https://openai.com/gptbot)	eyJfdG9rZW4iOiJsSXJkV2E1bGxoUUJEd3pnWVRXZ0Z1NWs4U3Q5U1IyUTFZSFFoYzJmIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778246947
XCn0uMYFG1KWWLhUwWXTN48pxQRjJd8z6G2kvQD6	\N	10.0.1.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJoZkJJemdmSDI2MVpac24yUUQzRDlGYmkzeUVnZ3V2OE5wUW1EWUZ4IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778312966
JH6ljAlCXBHqiPL9GuKaJsjusimQAFEqAwXuyjgC	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJFaEdPdlFYNVFlMDZ4WEFZZFdhZG1ORWxxWTd1SVlxY0Rta2d4STNIIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778334114
v0ZoGV8ZG3e1ndonr92pRe4C8ZUpiWHFLoq6wlBI	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36	eyJfdG9rZW4iOiJMWExmNzhvbk13Z1RFV1RzOHRmaWs0a0tBTVVDTzh3Tk9aMU9yZHpZIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778378897
Us8BIxG08u8wOTScte9Qwfy54PTs6c81ZnS1GHL8	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36	eyJfdG9rZW4iOiJTczRTUmduU0haY0VkR1MzbEx0WW5KRmVYS2hHa3BiM0FmU2lzVjh6IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778403156
rih7zYPfKAcwvYu9YCXOIAgt7zwHgiOpEeBuKhhI	\N	10.0.1.4	Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.3; +https://openai.com/gptbot)	eyJfdG9rZW4iOiJFSlRSU292d3pObXByZkt4R3laWWh1Q080aTdPelExMlFaSktwc3pXIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778433326
YwB0of6kvRDcop51szWEtTAngLvCYZNB3viQATKM	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0	eyJfdG9rZW4iOiJSM2dvUm16ZFRrc0lCQXhRZ0dUelhSakFZRzNiZXNtcEVRWnJxdGFkIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778438203
Gnhr2YL4MmPvF3alzEKgHQ2iStaCIJgjCpJ7tXGV	\N	10.0.1.5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36	eyJfdG9rZW4iOiJSb3lhdG1qbVBFemRZU2FwVXBNUjlRZEZhVXU0bDFjN0xzM0kxTG5OIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778702635
GVD5BvhrHMhXR84fc99oHs45Nwg8p6ush0NPgK2q	\N	10.0.1.10	Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604	eyJfdG9rZW4iOiJHVjREbDdVWnZ5R3M2ZkEyZ3U3dWU2OTFsYXZNMVNWaEFWOVNJbk1tIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778823043
xORKBq0R05Cp4soUocw9XhzJhQAUFVbfplxIk2Sp	\N	10.0.1.4	Mozilla/5.0 (compatible; InternetMeasurement/1.0; +https://internet-measurement.com/)	eyJfdG9rZW4iOiJZWjlpTlVNNDFQVmlKR1lzUzM1ZTZEcElUQkk4NzQ5bFYyQ0V0bW0wIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778128857
DBkx8XFA3QpYVrHFNriHyu7FUdQKPxOfkxCOO1LV	\N	10.0.1.4	Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/120.0	eyJfdG9rZW4iOiJEdGo1anFLZmdTMkxQSWxJU3RnWUhlMTZnTTRPTW1LV2x4eEZKMHEwIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778141053
RE9PVH1RTBmlW2NJzopZhfoXDPS6P667YUb7MlNu	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0	eyJfdG9rZW4iOiJpczdrY0NFZldLUXRMSFA1VnBTdHRlVnJUNnhUZGJZQlRGVnJBMEgyIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778156755
dFGXn730U053UvCKRqZfRUS5x6lHeSeMi84YEUeR	\N	10.0.1.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJoR3A0MWVLTTJ1ZWxiTGNUMDlKODhiY05vMFBlM3RnVFJQYmJSRlFKIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778159444
Tysykzx21h2DX6C8jmbyBubENpDQLE4pSF3TgZ9s	\N	10.0.1.4	Mozilla/5.0 (compatible; CMS-Checker/1.0; +https://example.com)	eyJfdG9rZW4iOiI3ZGdmTVQwYmZDVkttM2V5Wjd6UzE0WjVSM0RVQnEyQ0U4ZmpQdW1NIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778167894
Z7BhkKyerNdFg5HRTaZVDSV5C6vTu7HsuMEMwrE4	\N	10.0.1.4	Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/120.0	eyJfdG9rZW4iOiJlQzYzN2JJOEhJd3lQd01MQ0FhejJwOGwyQjJxQ01xRVNxbnJ4TXRrIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778299746
dHyfYXRef0ps5OCejfLloFlZApWrZSs1o6cu9mVJ	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJ0MDZJanR4NFBFMU5XNWlmdHZHS0E3UGR3SXpxWVhQbnN3OTgxSUlvIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778332739
xPdfdM6KeiIEnn9038cxtC4bMDV7F3MkWH1btBJA	\N	10.0.1.4	Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)	eyJfdG9rZW4iOiJiRFlZT0NrWWNKcVlIZElMRmZaNmFBZ1kyek5xYTd1bkdOcnRwYVYxIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778352228
BBcxbPcr6VZyNXkiWoch8l3UkLgrsBJBF7eLRgF3	\N	10.0.1.4		eyJfdG9rZW4iOiJoRGdES0pQREVZUWU0VENqZEdCTE8ycWw4cGV1SkIwWkIzdFkxSVdaIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778394747
LGP7eMPCEpWdKPDi09I5VwyP8IhSoSMWiwJqAVtY	\N	10.0.1.4	Mozilla/5.0 (X11; Linux i686; rv:124.0) Gecko/20100101 Firefox/124.0	eyJfdG9rZW4iOiJYUkNWWjFHYlJKNUdXbktETDU3czFKOTdtUjFNejY2bnA3VHkwbEJXIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778409382
Ly2CYTxa0hIDmmt036bXgqgyXXhNiAOMYK3gJOcW	\N	10.0.1.4	Mozilla/5.0 (compatible; CMS-Checker/1.0; +https://example.com)	eyJfdG9rZW4iOiJ0d3FTMmtTYkhabEhUTDJkU1FSSDlXVzllTGd4Z2wzRWlDdHp1VmdSIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778433645
Dn91LvgZFpoiHLfwFMpKRYQhk8SrUwIlXM0szKmO	\N	10.0.1.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0 Safari/537.36	eyJfdG9rZW4iOiJQMmhDWGJBaFB0dENYUVpCbkE0aWFlZlN3N0VWZUZWTUxHNTRDc1B5IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778438928
Ta8IzlkrMRWIgdGIXQZFhkoPaEeVJ9Umkvdc1uDu	\N	10.0.1.4	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJuRXcwMzVGZThuQzI3aXBwdEhKd3kzZ2tDTnpsMkpVYmFkS0xOSE9uIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778505927
zlW5tax8GtTbIypv5skAAV7zl7AbwNYxUew3VCCS	\N	10.0.1.4	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36	eyJfdG9rZW4iOiJjWEpnMWlWRHF0a2NEeWhkS1F5YXVKdXVKOVY2N0JxTTVNellsMTExIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778556490
z9OlWW9bMM7Kowjzii242PxMM5U9DmHQg15sJdfv	\N	10.0.1.4	Go-http-client/1.1	eyJfdG9rZW4iOiJiR01nTW1wSjFLS2FMV1J4VWU1SmZUVHZDVFJza2FKam5LRVp1MHM1IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778100293
iCcVxVeJ2gXVEBvp7kUvr4oPtpShVIfHuyFRNXzy	\N	10.0.1.5	Hello from Palo Alto Networks, find out more about our scans in https://docs-cortex.paloaltonetworks.com/r/1/Cortex-Xpanse/Scanning-activity	eyJfdG9rZW4iOiJnNUVmaXFFT0F6TVBBVlVaTFNibEVTdmZlYW9jbTFGbFlmUFpnUUhnIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778607463
jxN7lAQr6WCIsZAXZRjrBt4i839t4IlnecO2ZuFf	\N	10.0.1.5	Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.3; +https://openai.com/gptbot)	eyJfdG9rZW4iOiIwUXYyQ3c3TWxBZEhsSHU2UWVaZjdzc3hpZXZseVdmMHk3YmV6MG5BIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778719125
Mr1BL6ogJXnL1bjEb33wOhvZ1Dc24mpALcaFst7P	\N	10.0.1.10	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJ0cXdBNlIyclZGUHBmdUs5MzVsRUoxclc5OGQzUHJKbDAyN05GSnVYIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2FwaS5tZXJ4cG9zLmNvbSIsInJvdXRlIjpudWxsfSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==	1778825092
\.


--
-- Data for Name: store_configs; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.store_configs (id, tenant_id, key, value, created_at, updated_at, deleted_at) FROM stdin;
019e0065-0ce6-70fb-926e-eb2ae6a22495	38a95beb-e41e-4949-8224-caf230a9cf2c	currency_symbol	$	2026-05-07 03:04:42	2026-05-07 03:04:42	\N
019e0065-0ce9-7188-a11f-e4c9e4a35540	38a95beb-e41e-4949-8224-caf230a9cf2c	company	Tes2	2026-05-07 03:04:42	2026-05-07 03:04:42	\N
019e0065-0ceb-73a3-9835-2e2044a0b738	38a95beb-e41e-4949-8224-caf230a9cf2c	timezone	America/Caracas	2026-05-07 03:04:42	2026-05-07 03:04:42	\N
019e0065-0cee-704c-ad5d-53149bc0f7bc	38a95beb-e41e-4949-8224-caf230a9cf2c	language	es	2026-05-07 03:04:42	2026-05-07 03:04:42	\N
019e0065-0cf0-72ae-ac19-bc46da6983bc	38a95beb-e41e-4949-8224-caf230a9cf2c	enable_credit_sales	false	2026-05-07 03:04:42	2026-05-07 03:04:42	\N
019e0065-0cf3-7252-80ce-fe765aae909c	38a95beb-e41e-4949-8224-caf230a9cf2c	primaryColor	#7C3AED	2026-05-07 03:04:42	2026-05-07 03:04:42	\N
019e0065-0ce1-73dc-9281-e48495fc16a0	38a95beb-e41e-4949-8224-caf230a9cf2c	default_tax_rate	0	2026-05-07 03:04:42	2026-05-12 02:45:34	\N
019e1a4b-275d-73ee-8cc1-5feaac79c979	7bbb66d9-0762-47a5-a8f1-6f947427af1e	default_tax_rate	0	2026-05-12 03:46:33	2026-05-12 03:46:33	\N
019e1a4b-2768-707d-92f5-c98cd6831e53	7bbb66d9-0762-47a5-a8f1-6f947427af1e	currency_symbol	$	2026-05-12 03:46:33	2026-05-12 03:46:33	\N
019e1a4b-276b-71e4-bc53-99d64224cfe7	7bbb66d9-0762-47a5-a8f1-6f947427af1e	company	Tienda Principal	2026-05-12 03:46:33	2026-05-12 03:46:33	\N
019e1a4b-276f-70af-84c8-0864868bae83	7bbb66d9-0762-47a5-a8f1-6f947427af1e	timezone	America/Caracas	2026-05-12 03:46:33	2026-05-12 03:46:33	\N
019e1a4b-2773-71c2-a791-f542ff2f4742	7bbb66d9-0762-47a5-a8f1-6f947427af1e	language	es	2026-05-12 03:46:33	2026-05-12 03:46:33	\N
019e1a4b-2776-7299-bafa-34d4f13b10e7	7bbb66d9-0762-47a5-a8f1-6f947427af1e	primaryColor	#DB2777	2026-05-12 03:46:33	2026-05-12 03:46:33	\N
019e1a1e-e76c-72d5-b7f5-38d1269c5c82	7bbb66d9-0762-47a5-a8f1-6f947427af1e	enable_credit_sales	false	2026-05-12 02:58:13	2026-05-12 12:22:15	\N
019e054c-225e-725f-9dd8-b44e366fc036	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	enable_credit_sales	true	2026-05-08 01:55:36	2026-05-12 14:51:53	\N
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.stores (id, name, primary_color, logo_url, is_active, plan, rif, owner_email, created_at, updated_at, trial_ends_at, status) FROM stdin;
42110490-8cab-490a-a0d2-29f9d11335d3	test	#3B82F6	\N	f	STANDARD	adfcsad	thebestclar@gmail.com	2026-05-06 13:13:01	2026-05-07 01:37:36	\N	active
38a95beb-e41e-4949-8224-caf230a9cf2c	Tes2	#3B82F6	\N	t	STANDARD	273412321	roypro248@gmail.com	2026-05-07 02:13:50	2026-05-07 03:04:42	\N	active
69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	Bodega la Uniòn	#3B82F6	\N	t	STANDARD	2121323213	orangelramos1972@gmail.com	2026-05-07 03:06:17	2026-05-07 03:06:17	\N	active
7bbb66d9-0762-47a5-a8f1-6f947427af1e	Tienda Principal	#3B82F6	\N	t	FREE	\N	\N	2026-04-27 02:38:08	2026-05-12 03:46:33	\N	active
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: Magneto
--

COPY public.users (id, tenant_id, username, password, first_name, last_name, email, phone, address, role, telegram_chat_id, remember_token, created_at, updated_at, deleted_at) FROM stdin;
3	7bbb66d9-0762-47a5-a8f1-6f947427af1e	roy_admin	$2y$12$hoDfQ2uWcFjtpI57IGvNdOEGm4rhdkzmFW5.MBKwGfMxrx2yUOgXW	Roy	Calderon	roydanielcalderon28@gmail.com	\N	\N	SUPER_ADMIN	\N	tMbTziXEtWmFjBKnfFD9bCvGNPduX6YV3puQRSrOTSt3m693lLbIJD2SSeRk	2026-05-06 02:25:34	2026-05-06 02:50:43	\N
4	7bbb66d9-0762-47a5-a8f1-6f947427af1e	victor.rojas	$2y$12$hItbo5HqSGtmJ5yUAJgJK.R5AAHFmnSG5LIExUPiXSgQMr5G0pvWy	Victor	Rojas	0victor.rojas@gmail.com	\N	\N	SUPER_ADMIN	\N	\N	2026-05-06 02:56:09	2026-05-06 02:56:09	\N
5	7bbb66d9-0762-47a5-a8f1-6f947427af1e	josnel.blanco	$2y$12$qAy16AtIbkVMA2QdHnaFLeXS0Y54GzcfU2T.NzykQA1oFS3cxL5Y2	Josnel	Blanco	josnel.blanco@gmail.com	\N	\N	SUPER_ADMIN	\N	\N	2026-05-06 02:56:09	2026-05-06 02:56:09	\N
6	42110490-8cab-490a-a0d2-29f9d11335d3	thebestclar	$2y$12$KcmK7NNocwj.ghpb52x3AO.pI2twR3RrALHTuGTssQj3E.ypz5EhK	Thebestclar		thebestclar@gmail.com	\N	\N	ADMIN	\N	\N	2026-05-06 13:13:01	2026-05-06 13:13:01	\N
7	38a95beb-e41e-4949-8224-caf230a9cf2c	roypro248	$2y$12$SbObzN4afS78eg7DNXlMz.wZDiHeQed2SNR1DUAl/OaxHk/wi.QRW	Roypro248		roypro248@gmail.com	\N	\N	ADMIN	\N	\N	2026-05-07 02:13:50	2026-05-07 03:04:59	\N
8	69f6a61c-90d0-4cbf-8fa8-e71dbcc754ee	orangelramos1972	$2y$12$UPOXkVeg.c9UGUnMWQZ5Nu1LWgpfVER9CZDxMz4VM/dU0NcDdjcd2	Orangelramos1972		orangelramos1972@gmail.com	\N	\N	ADMIN	\N	\N	2026-05-07 03:06:17	2026-05-07 12:32:22	\N
\.


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Magneto
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Magneto
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Magneto
--

SELECT pg_catalog.setval('public.migrations_id_seq', 20, true);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Magneto
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 42, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Magneto
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: cash_shifts cash_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_tenant_id_name_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_tenant_id_name_unique UNIQUE (tenant_id, name);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_tenant_id_account_number_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_account_number_unique UNIQUE (tenant_id, account_number);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: items items_tenant_id_item_number_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_item_number_unique UNIQUE (tenant_id, item_number);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: processed_sync_events processed_sync_events_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.processed_sync_events
    ADD CONSTRAINT processed_sync_events_pkey PRIMARY KEY (event_id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_sale_id_item_id_line_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_item_id_line_unique UNIQUE (sale_id, item_id, line);


--
-- Name: sale_payments sale_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sales sales_tenant_id_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_tenant_id_invoice_number_unique UNIQUE (tenant_id, invoice_number);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: store_configs store_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.store_configs
    ADD CONSTRAINT store_configs_pkey PRIMARY KEY (id);


--
-- Name: store_configs store_configs_tenant_id_key_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.store_configs
    ADD CONSTRAINT store_configs_tenant_id_key_unique UNIQUE (tenant_id, key);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: cash_shifts unique_open_shift; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT unique_open_shift UNIQUE (tenant_id, user_id, status);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: cash_shifts_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX cash_shifts_tenant_id_index ON public.cash_shifts USING btree (tenant_id);


--
-- Name: cash_shifts_user_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX cash_shifts_user_id_index ON public.cash_shifts USING btree (user_id);


--
-- Name: categories_tenant_id_sort_order_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX categories_tenant_id_sort_order_index ON public.categories USING btree (tenant_id, sort_order);


--
-- Name: customers_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX customers_tenant_id_index ON public.customers USING btree (tenant_id);


--
-- Name: items_tenant_id_category_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX items_tenant_id_category_index ON public.items USING btree (tenant_id, category);


--
-- Name: items_tenant_id_deleted_at_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX items_tenant_id_deleted_at_index ON public.items USING btree (tenant_id, deleted_at);


--
-- Name: items_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX items_tenant_id_index ON public.items USING btree (tenant_id);


--
-- Name: items_tenant_id_sell_by_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX items_tenant_id_sell_by_index ON public.items USING btree (tenant_id, sell_by);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: processed_sync_events_tenant_id_entity_type_entity_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX processed_sync_events_tenant_id_entity_type_entity_id_index ON public.processed_sync_events USING btree (tenant_id, entity_type, entity_id);


--
-- Name: processed_sync_events_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX processed_sync_events_tenant_id_index ON public.processed_sync_events USING btree (tenant_id);


--
-- Name: processed_sync_events_tenant_id_processed_at_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX processed_sync_events_tenant_id_processed_at_index ON public.processed_sync_events USING btree (tenant_id, processed_at);


--
-- Name: sale_items_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sale_items_tenant_id_index ON public.sale_items USING btree (tenant_id);


--
-- Name: sale_payments_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sale_payments_tenant_id_index ON public.sale_payments USING btree (tenant_id);


--
-- Name: sale_payments_tenant_id_sale_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sale_payments_tenant_id_sale_id_index ON public.sale_payments USING btree (tenant_id, sale_id);


--
-- Name: sales_tenant_id_employee_id_sale_time_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sales_tenant_id_employee_id_sale_time_index ON public.sales USING btree (tenant_id, employee_id, sale_time);


--
-- Name: sales_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sales_tenant_id_index ON public.sales USING btree (tenant_id);


--
-- Name: sales_tenant_id_sale_time_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sales_tenant_id_sale_time_index ON public.sales USING btree (tenant_id, sale_time);


--
-- Name: sales_tenant_id_status_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sales_tenant_id_status_index ON public.sales USING btree (tenant_id, status);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: users_tenant_id_index; Type: INDEX; Schema: public; Owner: Magneto
--

CREATE INDEX users_tenant_id_index ON public.users USING btree (tenant_id);


--
-- Name: categories categories_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: customers customers_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: items items_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: processed_sync_events processed_sync_events_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.processed_sync_events
    ADD CONSTRAINT processed_sync_events_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_item_id_foreign FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: sale_items sale_items_sale_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_foreign FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_sale_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_sale_id_foreign FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: sales sales_customer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_foreign FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: sales sales_employee_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_employee_id_foreign FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: sales sales_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_configs store_configs_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.store_configs
    ADD CONSTRAINT store_configs_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: Magneto
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict KThlRB5C98GszX6lVCKYt738cFSbSI46GJjNNR0xgfH98hI0LHqQRaUsQH2qGkf

