import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { CartController } from "./controllers/cart.controller.js";
import { CartService } from "./cart.service.js";
import { PgCartRepository } from "./repositories/pg-cart.repository.js";

@Module({
	imports: [DatabaseModule],
	controllers: [CartController],
	providers: [CartService, PgCartRepository],
	exports: [CartService, PgCartRepository],
})
export class CartModule {}
