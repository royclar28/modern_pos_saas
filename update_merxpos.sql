-- Table: public.cash_registers

-- DROP TABLE public.cash_registers;

CREATE TABLE public.cash_registers
(
  cash_register_id serial NOT NULL,
  fk_user_register_id integer NOT NULL DEFAULT 2,
  fk_user_control_id integer,
  fk_store_id integer NOT NULL,
  cash_register_code character varying(45) NOT NULL,
  cash_register_name character varying(90) NOT NULL,
  actived smallint NOT NULL DEFAULT 1,
  deleted smallint NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_registers_pkey PRIMARY KEY (cash_register_id),
  CONSTRAINT fk_cashr491dfaf8db001 FOREIGN KEY (fk_user_register_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_cashr491dfaf8db002 FOREIGN KEY (fk_user_control_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_cashr491dfaf8db003 FOREIGN KEY (fk_store_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT unique_cash_register_code UNIQUE (cash_register_code)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.cash_registers
  OWNER TO postgres;
GRANT ALL ON TABLE public.cash_registers TO postgres;

-- Index: public.idx_cashr491dfaf8db001

-- DROP INDEX public.idx_cashr491dfaf8db001;

CREATE INDEX idx_cashr491dfaf8db001
  ON public.cash_registers
  USING btree
  (fk_user_register_id);

-- Index: public.idx_cashr491dfaf8db002

-- DROP INDEX public.idx_cashr491dfaf8db002;

CREATE INDEX idx_cashr491dfaf8db002
  ON public.cash_registers
  USING btree
  (fk_user_control_id);



CREATE INDEX idx_cashr491dfaf8db003
  ON public.cash_registers
  USING btree
  (fk_store_id);





-- Table: public.cash_register_users

-- DROP TABLE public.cash_register_users;

CREATE TABLE public.cash_register_users
(
  cash_register_user_id serial NOT NULL,
  fk_user_register_id integer NOT NULL,
  fk_user_control_id integer,
  fk_user_id integer NOT NULL,
  fk_cash_register_id integer NOT NULL,
  observations character varying(90) NOT NULL,
  actived smallint NOT NULL DEFAULT 1,
  deleted smallint NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_register_users_pkey PRIMARY KEY (cash_register_user_id),
  CONSTRAINT fk_casru491dfaf8db001 FOREIGN KEY (fk_user_register_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_casru491dfaf8db002 FOREIGN KEY (fk_user_control_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_casru491dfaf8db003 FOREIGN KEY (fk_user_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_casru491dfaf8db004 FOREIGN KEY (fk_cash_register_id)
      REFERENCES public.cash_registers (cash_register_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.cash_register_users
  OWNER TO postgres;
GRANT ALL ON TABLE public.cash_register_users TO postgres;

-- Index: public.idx_casru491dfaf8db001

-- DROP INDEX public.idx_casru491dfaf8db001;

CREATE INDEX idx_casru491dfaf8db001
  ON public.cash_register_users
  USING btree
  (fk_user_register_id);

-- Index: public.idx_casru491dfaf8db002

-- DROP INDEX public.idx_casru491dfaf8db002;

CREATE INDEX idx_casru491dfaf8db002
  ON public.cash_register_users
  USING btree
  (fk_user_control_id);



CREATE INDEX idx_casru491dfaf8db003
  ON public.cash_register_users
  USING btree
  (fk_user_id);
  
  
CREATE INDEX idx_casru491dfaf8db004
  ON public.cash_register_users
  USING btree
  (fk_cash_register_id);
  
  

-- Table: public.measurement_units

-- DROP TABLE public.measurement_units;

CREATE TABLE public.measurement_units
(
  measurement_unit_id serial NOT NULL,
  fk_user_register_id integer NOT NULL,
  fk_user_control_id integer,
  fk_store_id integer,
  measurement_unit_code character varying(45) NOT NULL,
  measurement_unit_name character varying(90) NOT NULL,
  actived smallint NOT NULL DEFAULT 1,
  deleted smallint NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT measurement_units_pkey PRIMARY KEY (measurement_unit_id),
  CONSTRAINT fk_meunit491dfaf8db001 FOREIGN KEY (fk_user_register_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_meunit491dfaf8db002 FOREIGN KEY (fk_user_control_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT fk_meunit491dfaf8db003 FOREIGN KEY (fk_store_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT unique_measurement_unit_code UNIQUE (measurement_unit_code)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.measurement_units
  OWNER TO postgres;
GRANT ALL ON TABLE public.measurement_units TO postgres;

-- Index: public.idx_meunit491dfaf8db001

-- DROP INDEX public.idx_meunit491dfaf8db001;

CREATE INDEX idx_meunit491dfaf8db001
  ON public.measurement_units
  USING btree
  (fk_user_register_id);

-- Index: public.idx_meunit491dfaf8db002

-- DROP INDEX public.idx_meunit491dfaf8db002;

CREATE INDEX idx_meunit491dfaf8db002
  ON public.measurement_units
  USING btree
  (fk_user_control_id);



CREATE INDEX idx_meunit491dfaf8db003
  ON public.measurement_units
  USING btree
  (fk_store_id);





ALTER TABLE public.items ADD COLUMN fk_cash_register_user_id integer;


ALTER TABLE ONLY public.items
    ADD CONSTRAINT fk_sali491dfaf8db001 FOREIGN KEY (fk_cash_register_user_id) REFERENCES public.cash_register_users(cash_register_user_id) ON DELETE RESTRICT;
	
	
CREATE INDEX idx_sali491dfaf8db001 ON public.sale_items USING btree (fk_cash_register_user_id);




ALTER TABLE public.items ADD COLUMN fk_measurement_unit_id integer;


ALTER TABLE ONLY public.items
    ADD CONSTRAINT fk_item491dfaf8db001 FOREIGN KEY (fk_measurement_unit_id) REFERENCES public.measurement_units(measurement_unit_id) ON DELETE RESTRICT;
	
	
CREATE INDEX idx_item491dfaf8db001 ON public.items USING btree (fk_measurement_unit_id);
