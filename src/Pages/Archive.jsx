import React, { useEffect,useMemo,useState } from 'react'
import './PagesCSS/Archive.css'
import { GetAllData } from '../Redux/ArchiveTab/ArchiveSlice'
import { useDispatch, useSelector } from 'react-redux'
import { getAllArchiveList } from '../Redux/ArchiveTab/ArchiveSlice'
import MessageBox from '../Components/MessageBox'
import DeleteConfirmation from '../Components/DeleteConfirmation'

const Archive = () => {
const dispatch=useDispatch()
const ArchiveList=useSelector(getAllArchiveList)
// const [delete,setDelete]=useState('')
const [message,setMessage]=useState("")
const [toggle,setToggle]=useState(false)
const [finalConfirm,setFinalConfirm]=useState(false)
const [confirmation,setConfirmation]=useState(false)
const [deleteConfirmationPopup,setDeleteConfirmationPopup]=useState(false)

useEffect(()=>{dispatch(GetAllData())},[])


useEffect(()=>{

  if(finalConfirm===true){
   
    if(message?.split(' ')?.includes("delete")){
      alert("delete")
    }
  }

},[finalConfirm])



const DelectConfirmationModal=useMemo(()=>(<DeleteConfirmation confirm={setFinalConfirm} show={deleteConfirmationPopup} handleClose={()=>setDeleteConfirmationPopup(false)} />),[deleteConfirmationPopup])

// const ConfirmationMessage=useMemo(()=>(<MessageBox setFinalConfirm={setToggle}  message={message} show={confirmation} handleClose={()=>setConfirmation(false)}  />),[confirmation])
  return (
    <>
  
    {DelectConfirmationModal}
   
    <div className="archiveBackground vh-100 ">
<div className="row m-2">
<div className="form-group col-3">
         <label>Free Text</label>
         <input type="text" className="form-control input " />
    </div>

    <div className="form-group col-2">
         <label>Author</label>
         <select className="form-select select">
            <option>Select</option>
         </select>
    </div>
    <div className="form-group col-2">
         <label>Book</label>
           <select className="form-select select">
            <option>Select</option>
         </select>
    </div>
    <div className="form-group col-2">
         <label>Title</label>
           <select className="form-select select">
            <option>Select</option>
         </select>
    </div>
</div>

<div className="card m-3">
<table className="table">
  <thead>
    <tr>
      <th scope="col">Text</th>
      <th scope="col">Author</th>
      <th scope="col">Book</th>
      <th scope="col">Title</th>
      <th scope="col">Action</th>
    </tr>
  </thead>
  <tbody>
    {
        ArchiveList?.map((key)=>(
            <tr key={key.id}>
            <th scope="row">{key.text}</th>
            <td>{key.author}</td>
            <td>{key.book}</td>
            <td>{key.title}</td>
            <td>
            <i onClick={()=>{ setMessage("Are you sure , you want to add this title");   setConfirmation(true)}}  className="bi bi-plus-lg m-2 cursor-pointer"></i>
            <i  onClick={()=>{ setMessage("Are you sure , you want to bookmark this title");   setConfirmation(true)}} class="bi bi-bookmark m-2"/>
            <i onClick={()=>{   setDeleteConfirmationPopup(true)}} class="bi bi-trash3 m-2"/>
            </td>
          </tr>
        ))
    }
 
  </tbody>
</table>
</div>

<div className="m-3">
    <div className="">
        <span>Rows per page:</span>
        <select>
            <option>10</option>
            <option>10</option>
            <option>10</option>
        </select>
    </div>
</div>
 
</div>

    </>
  )
}

export default Archive