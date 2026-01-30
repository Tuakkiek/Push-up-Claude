import User from "../models/User.js";

// Cập nhật thông tin người dùng
export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, province } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, email, province },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Thêm địa chỉ mới cho người dùng
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Nếu địa chỉ mới được chọn là mặc định, set tất cả các địa chỉ khác là không mặc định
    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(req.body);
    await user.save();

    res.json({
      success: true,
      message: "Thêm địa chỉ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Cập nhật địa chỉ cho người dùng
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy địa chỉ" });
    }

    // Nếu địa chỉ mới được chọn là mặc định, set tất cả các địa chỉ khác là không mặc định
    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Cập nhật địa chỉ
    Object.assign(address, req.body);
    await user.save();

    res.json({
      success: true,
      message: "Cập nhật địa chỉ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa địa chỉ của người dùng
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.addressId);
    await user.save();

    res.json({
      success: true,
      message: "Xóa địa chỉ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy tất cả nhân viên
// GET /api/users/employees - Lấy danh sách nhân viên (có phân trang + tìm kiếm + sắp xếp)
export const getAllEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // giới hạn tối đa 100

    // Điều kiện lọc
    const filter = {
      role: {
        $in: [
          "WAREHOUSE_STAFF",
          "ORDER_MANAGER",
          "SHIPPER",
          "ADMIN",
          "POS_STAFF",
          "CASHIER",
        ],
      },
    };

    // Tìm kiếm theo tên hoặc email hoặc số điện thoại
    if (search.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { phoneNumber: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Lọc theo role cụ thể (nếu có truyền)
    if (role && role !== "ALL") {
      filter.role = role;
    }

    // Sắp xếp
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Query với phân trang
    const employees = await User.find(filter)
      .select("-password -__v")
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    // Đếm tổng số để trả về phân trang
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
// Tạo nhân viên mới
export const createEmployee = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role, avatar } =
      req.body;

    const user = await User.create({
      fullName,
      phoneNumber,
      email,
      province,
      password,
      role,
      avatar: avatar || "",
    });
    res.status(201).json({
      success: true,
      message: "Tạo nhân viên thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Thay đổi trạng thái nhân viên (kích hoạt hoặc khóa)
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    // Chuyển đổi trạng thái giữa ACTIVE và LOCKED
    user.status = user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await user.save();

    res.json({
      success: true,
      message: `${
        user.status === "LOCKED" ? "Khóa" : "Mở khóa"
      } nhân viên thành công`,
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa nhân viên
export const deleteEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    res.json({ success: true, message: "Xóa nhân viên thành công" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEmployeeAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role, avatar } =
      req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    // Cập nhật thông tin
    user.fullName = fullName || user.fullName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    user.province = province || user.province;
    user.role = role || user.role;
    user.avatar = avatar !== undefined ? avatar : user.avatar;

    // Chỉ cập nhật password nếu được cung cấp
    if (password && password.trim()) {
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllShippers = async (req, res) => {
  try {
    const shippers = await User.find({ 
      role: "SHIPPER",
      status: "ACTIVE" 
    })
      .select("_id fullName phoneNumber email")
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: { shippers },
    });
  } catch (error) {
    console.error("Get all shippers error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};


