if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL is required for the full commerce chain.");
	console.error(
		"Example: DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce",
	);
	process.exit(1);
}
