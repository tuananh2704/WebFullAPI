import React, { FormEvent } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import type { ApiFood, ApiFoodSize } from "../../../types/api";
import { formatCurrency } from "../../../utils/format";

type FoodForm = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string;
};

type SizeForm = {
  id: string;
  size_name: "" | "S" | "M" | "L";
  price: string;
};

type FoodsSectionProps = {
  foods: ApiFood[];
  foodForm: FoodForm;
  setFoodForm: (form: FoodForm) => void;
  selectedFood: ApiFood | null;
  foodSizes: ApiFoodSize[];
  sizeForm: SizeForm;
  setSizeForm: (form: SizeForm) => void;
  handleSubmitFood: (event: FormEvent<HTMLFormElement>) => void;
  handleSubmitSize: (event: FormEvent<HTMLFormElement>) => void;
  handleSelectFood: (food: ApiFood) => void;
  handleEditFood: (food: ApiFood) => void;
  handleEditSize: (size: ApiFoodSize) => void;
  handleDeleteFood: (foodId: number) => Promise<void>;
  handleDeleteFoodSize: (foodSizeId: number) => Promise<void>;
  handleClearSizeForm: () => void;
};

const FoodsSection: React.FC<FoodsSectionProps> = ({
  foods,
  foodForm,
  setFoodForm,
  selectedFood,
  foodSizes,
  sizeForm,
  setSizeForm,
  handleSubmitFood,
  handleSubmitSize,
  handleSelectFood,
  handleEditFood,
  handleEditSize,
  handleDeleteFood,
  handleDeleteFoodSize,
  handleClearSizeForm,
}) => {
  const foodsByCategory = foods.reduce<Record<string, ApiFood[]>>((acc, food) => {
    const category = food.category_name || "Chưa phân loại";
    if (!acc[category]) acc[category] = [];
    acc[category].push(food);
    return acc;
  }, {});

  const categories = Object.keys(foodsByCategory).map((name) => ({
    id: name,
    name,
  }));

  const selectedFoodSizes = selectedFood
    ? foodSizes.filter((size) => size.food_id === selectedFood.id)
    : [];

  return (
    <div className="admin-workspace">
      <form className="form-panel admin-form" onSubmit={handleSubmitFood}>
        <h2>{foodForm.id ? "Sửa đồ ăn" : "Thêm đồ ăn mới"}</h2>

        <select
          required
          value={foodForm.category_id}
          onChange={(e) => setFoodForm({ ...foodForm, category_id: e.target.value })}
        >
          <option value="">Chọn danh mục</option>
          {categories.map((category) => (
            <option value={category.id} key={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <input
          required
          type="text"
          placeholder="Tên đồ ăn"
          value={foodForm.name}
          onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
        />

        <textarea
          placeholder="Mô tả"
          value={foodForm.description}
          onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
        />

        <input
          type="text"
          placeholder="Ảnh URL"
          value={foodForm.image_url}
          onChange={(e) => setFoodForm({ ...foodForm, image_url: e.target.value })}
        />

        <button className="primary-btn form-submit">
          <Plus size={18} />
          Lưu đồ ăn
        </button>
      </form>

      <div>
        <div className="data-card admin-table-card">
          <h2>Danh sách đồ ăn</h2>
          {Object.entries(foodsByCategory).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 24 }}>
              <h3>{category}</h3>
              <div className="admin-table">
                {items.map((food) => (
                  <div
                    className="admin-table-row"
                    key={food.id}
                    onClick={() => handleSelectFood(food)}
                    style={{
                      cursor: "pointer",
                      background:
                        selectedFood?.id === food.id ? "rgba(82, 196, 26, 0.08)" : "transparent",
                      gridTemplateColumns: "1.5fr 1fr 1fr 0.7fr 40px 40px",
                    }}
                  >
                    <strong>{food.name}</strong>
                    <span>{food.description || "Không có mô tả"}</span>
                    <span>{food.image_url || "Không có ảnh"}</span>
                    <span>{food.category_name}</span>
                    <button
                      title="Sửa đồ ăn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFood(food);
                      }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      title="Xóa đồ ăn"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDeleteFood(food.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedFood && (
          <div className="data-card admin-table-card" style={{ marginTop: 20 }}>
            <h2>Sizes của {selectedFood.name}</h2>

            <div className="admin-table">
              {selectedFoodSizes.length > 0 ? (
                selectedFoodSizes.map((size) => (
                  <div
                    className="admin-table-row"
                    key={size.id}
                    style={{
                      gridTemplateColumns: "1fr 1fr 1fr 40px 40px",
                    }}
                  >
                    <strong>{size.size_name}</strong>
                    <span>{formatCurrency(size.price)}</span>
                    <span>{size.food_name}</span>
                    <button title="Sửa size" onClick={() => handleEditSize(size)}>
                      <Edit3 size={16} />
                    </button>
                    <button
                      title="Xóa size"
                      onClick={async () => {
                        await handleDeleteFoodSize(size.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="admin-table-row">
                  <span>Chưa có size nào.</span>
                </div>
              )}
            </div>

            <form className="form-panel admin-form" onSubmit={handleSubmitSize}>
              <h3>{sizeForm.id ? "Sửa size" : "Thêm size mới"}</h3>

              <select
                required
                value={sizeForm.size_name}
                onChange={(e) =>
                  setSizeForm({ ...sizeForm, size_name: e.target.value as SizeForm["size_name"] })
                }
              >
                <option value="">Chọn size</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>

              <input
                required
                type="number"
                min="0"
                placeholder="Giá"
                value={sizeForm.price}
                onChange={(e) => setSizeForm({ ...sizeForm, price: e.target.value })}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="primary-btn form-submit" type="submit">
                  <Plus size={18} />
                  Lưu size
                </button>
                <button
                  type="button"
                  className="secondary-btn compact"
                  onClick={handleClearSizeForm}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodsSection;
